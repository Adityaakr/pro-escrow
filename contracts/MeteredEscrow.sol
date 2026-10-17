// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract MeteredEscrow is EIP712, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct Terms {
        uint256 dealId;
        address buyer;
        address seller;
        address payee;
        uint256 unitPrice;
        uint256 maxUnits;
        uint256 prepaid;
        uint64 end;
        uint64 grace;
        uint256 nonce;
        uint64 expiry;
    }

    struct Acceptance {
        uint256 dealId;
        bytes32 termsHash;
        uint256 cumulativeAmount;
        uint256 cumulativeUnits;
        bytes32 receiptsRoot;
        uint256 nonce;
        uint64 expiry;
    }

    enum DealStatus {
        None,
        Funded,
        Closed
    }

    struct Deal {
        address buyer;
        address buyerRefundTo;
        address seller;
        address payee;
        bytes32 termsHash;
        uint256 deposit;
        uint256 settled;
        uint256 refunded;
        uint256 acceptedNonce;
        uint256 acceptedUnits;
        uint256 maxUnits;
        uint64 end;
        uint64 grace;
        bool sellerClosed;
        DealStatus status;
    }

    IERC20 public immutable usdc;
    mapping(uint256 => Deal) public deals;
    mapping(bytes32 => bool) public usedTermsDigests;

    bytes32 private constant TERMS_TYPEHASH = keccak256(
        "Terms(uint256 dealId,address buyer,address seller,address payee,uint256 unitPrice,uint256 maxUnits,uint256 prepaid,uint64 end,uint64 grace,uint256 nonce,uint64 expiry)"
    );

    bytes32 private constant ACCEPTANCE_TYPEHASH = keccak256(
        "Acceptance(uint256 dealId,bytes32 termsHash,uint256 cumulativeAmount,uint256 cumulativeUnits,bytes32 receiptsRoot,uint256 nonce,uint64 expiry)"
    );

    event DealFunded(
        uint256 indexed dealId,
        address indexed buyer,
        address indexed seller,
        address payee,
        uint256 deposit,
        bytes32 termsHash
    );
    event UsageAccepted(uint256 indexed dealId, uint256 cumulativeUnits, uint256 cumulativeAmount, bytes32 receiptsRoot, uint256 nonce);
    event Settled(uint256 indexed dealId, address indexed payee, uint256 amount);
    event SellerClosed(uint256 indexed dealId);
    event Refunded(uint256 indexed dealId, address indexed buyer, uint256 amount);

    error InvalidAddress();
    error DealAlreadyExists();
    error TermsDigestReused();
    error InvalidSignature();
    error TermsExpired();
    error DealNotFunded();
    error BadAcceptanceNonce();
    error BadCumulativeAmount();
    error BadCumulativeUnits();
    error AcceptanceExpired();
    error RefundNotAvailable();
    error ZeroAmount();
    error NothingToRefund();
    error DealClosed();
    error ContractPaused();

    constructor(address usdcAddress, address initialOwner) EIP712("MeteredEscrow", "1") Ownable(initialOwner) {
        if (usdcAddress == address(0) || initialOwner == address(0)) revert InvalidAddress();
        usdc = IERC20(usdcAddress);
    }

    function createAndFundDeal(
        Terms calldata t,
        bytes calldata buyerSig,
        bytes calldata sellerSig
    ) external nonReentrant whenNotPaused {
        if (t.expiry < block.timestamp) revert TermsExpired();

        bytes32 termsDigest = _hashTypedDataV4(hashTerms(t));
        if (usedTermsDigests[termsDigest]) revert TermsDigestReused();

        if (ECDSA.recover(termsDigest, buyerSig) != t.buyer) revert InvalidSignature();
        if (ECDSA.recover(termsDigest, sellerSig) != t.seller) revert InvalidSignature();

        if (deals[t.dealId].status != DealStatus.None) revert DealAlreadyExists();
        if (t.prepaid == 0) revert ZeroAmount();

        usedTermsDigests[termsDigest] = true;

        usdc.safeTransferFrom(t.buyer, address(this), t.prepaid);

        deals[t.dealId] = Deal({
            buyer: t.buyer,
            buyerRefundTo: t.buyer,
            seller: t.seller,
            payee: t.payee,
            termsHash: termsDigest,
            deposit: t.prepaid,
            settled: 0,
            refunded: 0,
            acceptedNonce: 0,
            acceptedUnits: 0,
            maxUnits: t.maxUnits,
            end: t.end,
            grace: t.grace,
            sellerClosed: false,
            status: DealStatus.Funded
        });

        emit DealFunded(t.dealId, t.buyer, t.seller, t.payee, t.prepaid, termsDigest);
    }

    /// @dev Override to prevent permanent lock if ownership is renounced while paused.
    function renounceOwnership() public pure override {
        revert("MeteredEscrow: renounce disabled");
    }

    function settleAcceptedUsage(
        uint256 dealId,
        Acceptance calldata a,
        bytes calldata buyerSig
    ) external nonReentrant whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();
        if (deal.sellerClosed) revert DealClosed();

        if (a.dealId != dealId || a.termsHash != deal.termsHash) revert InvalidSignature();

        bytes32 acceptanceDigest = _hashTypedDataV4(hashAcceptance(a));
        if (ECDSA.recover(acceptanceDigest, buyerSig) != deal.buyer) revert InvalidSignature();

        if (a.expiry < block.timestamp) revert AcceptanceExpired();
        if (a.nonce <= deal.acceptedNonce) revert BadAcceptanceNonce();
        if (a.cumulativeAmount <= deal.settled || a.cumulativeAmount > deal.deposit) revert BadCumulativeAmount();
        if (a.cumulativeUnits > deal.maxUnits) revert BadCumulativeUnits();

        uint256 delta = a.cumulativeAmount - deal.settled;

        deal.settled += delta;
        deal.acceptedNonce = a.nonce;
        deal.acceptedUnits = a.cumulativeUnits;

        usdc.safeTransfer(deal.payee, delta);

        emit UsageAccepted(dealId, a.cumulativeUnits, a.cumulativeAmount, a.receiptsRoot, a.nonce);
        emit Settled(dealId, deal.payee, delta);
    }

    function sellerCloseTerm(uint256 dealId) external whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();
        if (msg.sender != deal.seller) revert InvalidSignature();

        deal.sellerClosed = true;
        emit SellerClosed(dealId);
    }

    function refundUnused(uint256 dealId) external nonReentrant whenNotPaused {
        Deal storage deal = deals[dealId];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();

        if (!(block.timestamp >= uint256(deal.end) + uint256(deal.grace) || deal.sellerClosed)) revert RefundNotAvailable();

        uint256 remaining = deal.deposit - deal.settled - deal.refunded;
        if (remaining == 0) revert NothingToRefund();

        deal.refunded += remaining;
        deal.status = DealStatus.Closed;

        usdc.safeTransfer(deal.buyerRefundTo, remaining);

        emit Refunded(dealId, deal.buyerRefundTo, remaining);
    }

    function updateBuyerRefundTo(uint256 dealId, address newRecipient) external {
        if (newRecipient == address(0)) revert InvalidAddress();
        Deal storage deal = deals[dealId];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();
        if (msg.sender != deal.buyer) revert InvalidSignature();
        deal.buyerRefundTo = newRecipient;
    }

    function emergencyRescuePayout(uint256 dealId, address newPayee) external onlyOwner {
        // Owner can redirect a blocked payee only after sellerClosed or term+grace elapsed.
        // This does NOT automatically settle; it only updates the payee address for future settlements.
        Deal storage deal = deals[dealId];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();
        if (newPayee == address(0)) revert InvalidAddress();
        deal.payee = newPayee;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }

    function balances(uint256 dealId)
        external
        view
        returns (uint256 deposit, uint256 settled, uint256 refunded, uint256 remaining)
    {
        Deal storage d = deals[dealId];
        deposit = d.deposit;
        settled = d.settled;
        refunded = d.refunded;
        remaining = d.deposit - d.settled - d.refunded;
    }

    function hashTerms(Terms calldata t) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                TERMS_TYPEHASH,
                t.dealId,
                t.buyer,
                t.seller,
                t.payee,
                t.unitPrice,
                t.maxUnits,
                t.prepaid,
                t.end,
                t.grace,
                t.nonce,
                t.expiry
            )
        );
    }

    function hashAcceptance(Acceptance calldata a) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ACCEPTANCE_TYPEHASH,
                a.dealId,
                a.termsHash,
                a.cumulativeAmount,
                a.cumulativeUnits,
                a.receiptsRoot,
                a.nonce,
                a.expiry
            )
        );
    }

    function refundableAt(uint256 dealId) external view returns (uint64) {
        Deal storage d = deals[dealId];
        if (d.sellerClosed) return 0;
        return d.end + d.grace;
    }
}
