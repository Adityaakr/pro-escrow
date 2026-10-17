// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MeteredEscrow} from "../MeteredEscrow.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract MeteredEscrowTest is Test {
    // -----------------------------------------------------------------------
    // Constants / test actors
    // -----------------------------------------------------------------------

    // Canonical Arc USDC address (hardcoded in production; we mock it here).
    address internal constant USDC_ADDR = 0x3600000000000000000000000000000000000000;

    // Private keys for signing (deterministic from makeAddr-equiv)
    uint256 internal constant BUYER_PK  = 0xB0;
    uint256 internal constant SELLER_PK = 0x5E;
    uint256 internal constant RANDO_PK  = 0xFF;

    address internal buyer;
    address internal seller;
    address internal payee;
    address internal owner;
    address internal rando;

    MockERC20       internal usdc;
    MeteredEscrow   internal escrow;

    // EIP-712 type-hash strings – must match exactly what the contract hashes
    bytes32 internal constant TERMS_TYPEHASH = keccak256(
        "Terms(uint256 dealId,address buyer,address seller,address payee,uint256 unitPrice,uint256 maxUnits,uint256 prepaid,uint64 end,uint64 grace,uint256 nonce,uint64 expiry)"
    );
    bytes32 internal constant ACCEPTANCE_TYPEHASH = keccak256(
        "Acceptance(uint256 dealId,bytes32 termsHash,uint256 cumulativeAmount,uint256 cumulativeUnits,bytes32 receiptsRoot,uint256 nonce,uint64 expiry)"
    );

    // -----------------------------------------------------------------------
    // setUp
    // -----------------------------------------------------------------------

    function setUp() public {
        buyer  = vm.addr(BUYER_PK);
        seller = vm.addr(SELLER_PK);
        rando  = vm.addr(RANDO_PK);
        payee  = makeAddr("payee");
        owner  = makeAddr("owner");

        // 1. Deploy MockERC20 to a throwaway address, then etch its bytecode to
        //    the canonical USDC address so the contract's immutable `usdc` points
        //    to working token code.
        MockERC20 mockImpl = new MockERC20("Mock USDC", "mUSDC", 6);
        vm.etch(USDC_ADDR, address(mockImpl).code);
        usdc = MockERC20(USDC_ADDR);

        // 2. Deploy the contract under test – its constructor sets usdc = USDC_ADDR.
        escrow = new MeteredEscrow(USDC_ADDR, owner);

        // 3. Seed buyer with USDC and approve.
        usdc.mint(buyer, 1_000_000e6);
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// Build the EIP-712 domain separator for the deployed escrow contract.
    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("MeteredEscrow"),
                keccak256("1"),
                block.chainid,
                address(escrow)
            )
        );
    }

    /// Sign a Terms struct and return (buyerSig, sellerSig, termsDigest).
    function _signTerms(MeteredEscrow.Terms memory t)
        internal
        view
        returns (bytes memory buyerSig, bytes memory sellerSig, bytes32 termsDigest)
    {
        bytes32 structHash = keccak256(
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
        termsDigest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));

        (uint8 bv, bytes32 br, bytes32 bs) = vm.sign(BUYER_PK,  termsDigest);
        (uint8 sv, bytes32 sr, bytes32 ss) = vm.sign(SELLER_PK, termsDigest);
        buyerSig  = abi.encodePacked(br, bs, bv);
        sellerSig = abi.encodePacked(sr, ss, sv);
    }

    /// Sign an Acceptance struct and return (buyerSig, acceptanceDigest).
    function _signAcceptance(MeteredEscrow.Acceptance memory a, uint256 signerPk)
        internal
        view
        returns (bytes memory sig, bytes32 digest)
    {
        bytes32 structHash = keccak256(
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
        digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        sig = abi.encodePacked(r, s, v);
    }

    /// Create a default Terms for deal 1.
    function _defaultTerms() internal view returns (MeteredEscrow.Terms memory t) {
        t = MeteredEscrow.Terms({
            dealId:    1,
            buyer:     buyer,
            seller:    seller,
            payee:     payee,
            unitPrice: 1e6,
            maxUnits:  100,
            prepaid:   100e6,
            end:       uint64(block.timestamp + 7 days),
            grace:     uint64(1 days),
            nonce:     0,
            expiry:    uint64(block.timestamp + 1 hours)
        });
    }

    /// Fund deal 1 with default terms, return the termsDigest.
    function _fundDefaultDeal() internal returns (bytes32 termsDigest) {
        MeteredEscrow.Terms memory t = _defaultTerms();
        (bytes memory bs, bytes memory ss, bytes32 td) = _signTerms(t);
        termsDigest = td;
        escrow.createAndFundDeal(t, bs, ss);
    }

    /// Create a default Acceptance pointing at the funded deal.
    function _defaultAcceptance(bytes32 termsHash) internal view returns (MeteredEscrow.Acceptance memory a) {
        a = MeteredEscrow.Acceptance({
            dealId:           1,
            termsHash:        termsHash,
            cumulativeAmount: 30e6,
            cumulativeUnits:  30,
            receiptsRoot:     bytes32(0),
            nonce:            1,
            expiry:           uint64(block.timestamp + 1 hours)
        });
    }

    // -----------------------------------------------------------------------
    // 1. createAndFundDeal — happy path
    // -----------------------------------------------------------------------

    function test_CreateAndFundDeal_HappyPath() public {
        MeteredEscrow.Terms memory t = _defaultTerms();
        (bytes memory bs, bytes memory ss, bytes32 td) = _signTerms(t);

        vm.expectEmit(true, true, true, true, address(escrow));
        emit MeteredEscrow.DealFunded(t.dealId, t.buyer, t.seller, t.payee, t.prepaid, td);

        escrow.createAndFundDeal(t, bs, ss);

        // USDC pulled from buyer
        assertEq(usdc.balanceOf(address(escrow)), t.prepaid, "escrow balance");
        assertEq(usdc.balanceOf(buyer), 1_000_000e6 - t.prepaid, "buyer balance");

        // Deal state stored correctly
        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        assertEq(d.buyer,    buyer,   "deal.buyer");
        assertEq(d.seller,   seller,  "deal.seller");
        assertEq(d.payee,    payee,   "deal.payee");
        assertEq(d.deposit,  t.prepaid, "deal.deposit");
        assertEq(d.settled,  0,       "deal.settled");
        assertEq(d.refunded, 0,       "deal.refunded");
        assertEq(uint8(d.status), uint8(MeteredEscrow.DealStatus.Funded), "deal.status");
        assertEq(d.termsHash, td,     "deal.termsHash");
    }

    // -----------------------------------------------------------------------
    // 2. createAndFundDeal — revert paths
    // -----------------------------------------------------------------------

    function test_CreateAndFundDeal_Revert_Expired() public {
        MeteredEscrow.Terms memory t = _defaultTerms();
        t.expiry = uint64(block.timestamp - 1); // already expired
        (bytes memory bs, bytes memory ss,) = _signTerms(t);

        vm.expectRevert(MeteredEscrow.TermsExpired.selector);
        escrow.createAndFundDeal(t, bs, ss);
    }

    function test_CreateAndFundDeal_Revert_DigestReuse() public {
        MeteredEscrow.Terms memory t = _defaultTerms();
        (bytes memory bs, bytes memory ss,) = _signTerms(t);
        escrow.createAndFundDeal(t, bs, ss);

        // Attempt to reuse same terms for deal 2 — digest is identical
        // so TermsDigestReused fires before DealAlreadyExists
        t.dealId = 2;
        // Re-sign with the SAME underlying struct hash (same terms bytes), but
        // change dealId so deals[2].status == None; the digest reuse check fires first.
        // Actually to trigger TermsDigestReused we need the same exact Terms struct hash.
        // So we restore the original terms and try createAndFundDeal again.
        MeteredEscrow.Terms memory t2 = _defaultTerms(); // same struct
        (bytes memory bs2, bytes memory ss2,) = _signTerms(t2);
        vm.expectRevert(MeteredEscrow.TermsDigestReused.selector);
        escrow.createAndFundDeal(t2, bs2, ss2);
    }

    function test_CreateAndFundDeal_Revert_WrongBuyerSig() public {
        MeteredEscrow.Terms memory t = _defaultTerms();
        (, bytes memory ss,) = _signTerms(t);

        // Sign buyer portion with a rando key
        bytes32 structHash = keccak256(
            abi.encode(
                TERMS_TYPEHASH,
                t.dealId, t.buyer, t.seller, t.payee, t.unitPrice,
                t.maxUnits, t.prepaid, t.end, t.grace, t.nonce, t.expiry
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 rv, bytes32 rr, bytes32 rs) = vm.sign(RANDO_PK, digest);
        bytes memory badBuyerSig = abi.encodePacked(rr, rs, rv);

        vm.expectRevert(MeteredEscrow.InvalidSignature.selector);
        escrow.createAndFundDeal(t, badBuyerSig, ss);
    }

    function test_CreateAndFundDeal_Revert_WrongSellerSig() public {
        MeteredEscrow.Terms memory t = _defaultTerms();
        (bytes memory bs,,) = _signTerms(t);

        // Sign seller portion with a rando key
        bytes32 structHash = keccak256(
            abi.encode(
                TERMS_TYPEHASH,
                t.dealId, t.buyer, t.seller, t.payee, t.unitPrice,
                t.maxUnits, t.prepaid, t.end, t.grace, t.nonce, t.expiry
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 rv, bytes32 rr, bytes32 rs) = vm.sign(RANDO_PK, digest);
        bytes memory badSellerSig = abi.encodePacked(rr, rs, rv);

        vm.expectRevert(MeteredEscrow.InvalidSignature.selector);
        escrow.createAndFundDeal(t, bs, badSellerSig);
    }

    function test_CreateAndFundDeal_Revert_DealAlreadyExists() public {
        // Fund deal 1 once
        MeteredEscrow.Terms memory t = _defaultTerms();
        (bytes memory bs, bytes memory ss,) = _signTerms(t);
        escrow.createAndFundDeal(t, bs, ss);

        // Same dealId but different terms (different nonce) → new digest, but dealId still 1
        t.nonce = 1;
        t.expiry = uint64(block.timestamp + 2 hours);
        (bytes memory bs2, bytes memory ss2,) = _signTerms(t);
        vm.expectRevert(MeteredEscrow.DealAlreadyExists.selector);
        escrow.createAndFundDeal(t, bs2, ss2);
    }

    function test_CreateAndFundDeal_Revert_ZeroPrepaid() public {
        MeteredEscrow.Terms memory t = _defaultTerms();
        t.prepaid = 0;
        (bytes memory bs, bytes memory ss,) = _signTerms(t);

        vm.expectRevert(MeteredEscrow.ZeroAmount.selector);
        escrow.createAndFundDeal(t, bs, ss);
    }

    // -----------------------------------------------------------------------
    // 3. settleAcceptedUsage — happy path
    // -----------------------------------------------------------------------

    function test_SettleAcceptedUsage_HappyPath() public {
        bytes32 td = _fundDefaultDeal();

        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td);
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);

        uint256 payeeBefore = usdc.balanceOf(payee);

        vm.expectEmit(true, false, false, true, address(escrow));
        emit MeteredEscrow.UsageAccepted(1, a.cumulativeUnits, a.cumulativeAmount, a.receiptsRoot, a.nonce);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MeteredEscrow.Settled(1, payee, a.cumulativeAmount);

        escrow.settleAcceptedUsage(1, a, sig);

        assertEq(usdc.balanceOf(payee), payeeBefore + a.cumulativeAmount, "payee received delta");

        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        assertEq(d.settled, a.cumulativeAmount, "deal.settled");
        assertEq(d.acceptedNonce, a.nonce,       "deal.acceptedNonce");
        assertEq(d.acceptedUnits, a.cumulativeUnits, "deal.acceptedUnits");
    }

    // -----------------------------------------------------------------------
    // 4. settleAcceptedUsage after sellerClosed → DealClosed
    // -----------------------------------------------------------------------

    function test_SettleAcceptedUsage_Revert_SellerClosed() public {
        bytes32 td = _fundDefaultDeal();

        vm.prank(seller);
        escrow.sellerCloseTerm(1);

        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td);
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);

        vm.expectRevert(MeteredEscrow.DealClosed.selector);
        escrow.settleAcceptedUsage(1, a, sig);
    }

    // -----------------------------------------------------------------------
    // 5. settleAcceptedUsage — revert paths
    // -----------------------------------------------------------------------

    function test_SettleAcceptedUsage_Revert_BadNonce() public {
        bytes32 td = _fundDefaultDeal();

        // First settlement with nonce=1
        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td);
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);
        escrow.settleAcceptedUsage(1, a, sig);

        // Second settlement reusing nonce=1 (not >1)
        MeteredEscrow.Acceptance memory a2 = MeteredEscrow.Acceptance({
            dealId:           1,
            termsHash:        td,
            cumulativeAmount: 50e6,
            cumulativeUnits:  50,
            receiptsRoot:     bytes32(0),
            nonce:            1, // same nonce, not advancing
            expiry:           uint64(block.timestamp + 1 hours)
        });
        (bytes memory sig2,) = _signAcceptance(a2, BUYER_PK);

        vm.expectRevert(MeteredEscrow.BadAcceptanceNonce.selector);
        escrow.settleAcceptedUsage(1, a2, sig2);
    }

    function test_SettleAcceptedUsage_Revert_CumulativeExceedsDeposit() public {
        bytes32 td = _fundDefaultDeal();

        // cumulativeAmount > deposit (100e6)
        MeteredEscrow.Acceptance memory a = MeteredEscrow.Acceptance({
            dealId:           1,
            termsHash:        td,
            cumulativeAmount: 101e6,
            cumulativeUnits:  100,
            receiptsRoot:     bytes32(0),
            nonce:            1,
            expiry:           uint64(block.timestamp + 1 hours)
        });
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);

        vm.expectRevert(MeteredEscrow.BadCumulativeAmount.selector);
        escrow.settleAcceptedUsage(1, a, sig);
    }

    function test_SettleAcceptedUsage_Revert_Expired() public {
        bytes32 td = _fundDefaultDeal();

        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td);
        a.expiry = uint64(block.timestamp - 1); // expired
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);

        vm.expectRevert(MeteredEscrow.AcceptanceExpired.selector);
        escrow.settleAcceptedUsage(1, a, sig);
    }

    function test_SettleAcceptedUsage_Revert_WrongSigner() public {
        bytes32 td = _fundDefaultDeal();

        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td);
        // Sign with seller's key instead of buyer's
        (bytes memory sig,) = _signAcceptance(a, SELLER_PK);

        vm.expectRevert(MeteredEscrow.InvalidSignature.selector);
        escrow.settleAcceptedUsage(1, a, sig);
    }

    function test_SettleAcceptedUsage_Revert_BadTermsHash() public {
        _fundDefaultDeal();

        MeteredEscrow.Acceptance memory a = MeteredEscrow.Acceptance({
            dealId:           1,
            termsHash:        bytes32(uint256(0xDEAD)), // wrong hash
            cumulativeAmount: 30e6,
            cumulativeUnits:  30,
            receiptsRoot:     bytes32(0),
            nonce:            1,
            expiry:           uint64(block.timestamp + 1 hours)
        });
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);

        vm.expectRevert(MeteredEscrow.InvalidSignature.selector);
        escrow.settleAcceptedUsage(1, a, sig);
    }

    function test_SettleAcceptedUsage_Revert_DealNotFunded() public {
        bytes32 td = bytes32(0); // dummy
        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td);
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);

        // Deal 999 was never funded
        vm.expectRevert(MeteredEscrow.DealNotFunded.selector);
        escrow.settleAcceptedUsage(999, a, sig);
    }

    // -----------------------------------------------------------------------
    // 6. sellerCloseTerm — happy path
    // -----------------------------------------------------------------------

    function test_SellerCloseTerm_HappyPath() public {
        _fundDefaultDeal();

        vm.expectEmit(true, false, false, false, address(escrow));
        emit MeteredEscrow.SellerClosed(1);

        vm.prank(seller);
        escrow.sellerCloseTerm(1);

        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        assertTrue(d.sellerClosed, "sellerClosed flag");
    }

    // -----------------------------------------------------------------------
    // 7. sellerCloseTerm — reverts
    // -----------------------------------------------------------------------

    function test_SellerCloseTerm_Revert_NotSeller() public {
        _fundDefaultDeal();

        vm.prank(rando);
        vm.expectRevert(MeteredEscrow.InvalidSignature.selector);
        escrow.sellerCloseTerm(1);
    }

    function test_SellerCloseTerm_Revert_DealNotFunded() public {
        vm.prank(seller);
        vm.expectRevert(MeteredEscrow.DealNotFunded.selector);
        escrow.sellerCloseTerm(999);
    }

    // -----------------------------------------------------------------------
    // 8. refundUnused — happy path after end+grace
    // -----------------------------------------------------------------------

    function test_RefundUnused_HappyPath_AfterEndGrace() public {
        bytes32 td = _fundDefaultDeal();

        // Settle some usage
        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td); // 30e6
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);
        escrow.settleAcceptedUsage(1, a, sig);

        // Warp past end + grace
        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        vm.warp(uint256(d.end) + uint256(d.grace) + 1);

        uint256 buyerBefore = usdc.balanceOf(buyer);
        uint256 expected = d.deposit - d.settled; // 100e6 - 30e6 = 70e6

        vm.expectEmit(true, true, false, true, address(escrow));
        emit MeteredEscrow.Refunded(1, buyer, expected);

        escrow.refundUnused(1);

        assertEq(usdc.balanceOf(buyer), buyerBefore + expected, "buyer refund");

        MeteredEscrow.Deal memory d2 = escrow.getDeal(1);
        assertEq(d2.refunded, expected,                              "deal.refunded");
        assertEq(uint8(d2.status), uint8(MeteredEscrow.DealStatus.Closed), "deal.status Closed");
    }

    // -----------------------------------------------------------------------
    // 9. refundUnused after sellerCloseTerm
    // -----------------------------------------------------------------------

    function test_RefundUnused_AfterSellerClose() public {
        bytes32 td = _fundDefaultDeal();

        // Settle partial
        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td); // 30e6
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);
        escrow.settleAcceptedUsage(1, a, sig);

        vm.prank(seller);
        escrow.sellerCloseTerm(1);

        uint256 buyerBefore = usdc.balanceOf(buyer);
        escrow.refundUnused(1);
        uint256 expected = 100e6 - 30e6;
        assertEq(usdc.balanceOf(buyer), buyerBefore + expected, "buyer refund after sellerClose");
    }

    // -----------------------------------------------------------------------
    // 10. refundUnused — reverts
    // -----------------------------------------------------------------------

    function test_RefundUnused_Revert_TooEarly() public {
        _fundDefaultDeal();

        // Still within term, seller hasn't closed
        vm.expectRevert(MeteredEscrow.RefundNotAvailable.selector);
        escrow.refundUnused(1);
    }

    function test_RefundUnused_Revert_NothingToRefund() public {
        bytes32 td = _fundDefaultDeal();

        // Settle 100% of deposit so remaining == 0
        MeteredEscrow.Acceptance memory a = MeteredEscrow.Acceptance({
            dealId:           1,
            termsHash:        td,
            cumulativeAmount: 100e6,
            cumulativeUnits:  100,
            receiptsRoot:     bytes32(0),
            nonce:            1,
            expiry:           uint64(block.timestamp + 1 hours)
        });
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);
        escrow.settleAcceptedUsage(1, a, sig);

        vm.prank(seller);
        escrow.sellerCloseTerm(1);

        vm.expectRevert(MeteredEscrow.NothingToRefund.selector);
        escrow.refundUnused(1);
    }

    // -----------------------------------------------------------------------
    // 11. updateBuyerRefundTo
    // -----------------------------------------------------------------------

    function test_UpdateBuyerRefundTo_HappyPath() public {
        _fundDefaultDeal();

        address alt = makeAddr("altRefund");
        vm.prank(buyer);
        escrow.updateBuyerRefundTo(1, alt);

        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        assertEq(d.buyerRefundTo, alt, "buyerRefundTo updated");
    }

    function test_UpdateBuyerRefundTo_Revert_NotBuyer() public {
        _fundDefaultDeal();

        vm.prank(rando);
        vm.expectRevert(MeteredEscrow.InvalidSignature.selector);
        escrow.updateBuyerRefundTo(1, makeAddr("x"));
    }

    function test_UpdateBuyerRefundTo_Revert_ZeroAddress() public {
        _fundDefaultDeal();

        vm.prank(buyer);
        vm.expectRevert(MeteredEscrow.InvalidAddress.selector);
        escrow.updateBuyerRefundTo(1, address(0));
    }

    // -----------------------------------------------------------------------
    // 11b. refundUnused goes to alternate buyerRefundTo address
    // -----------------------------------------------------------------------

    function test_RefundUnused_UsesAltRefundTo() public {
        _fundDefaultDeal();

        address alt = makeAddr("altRefund");
        vm.prank(buyer);
        escrow.updateBuyerRefundTo(1, alt);

        // Warp past end+grace
        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        vm.warp(uint256(d.end) + uint256(d.grace) + 1);

        uint256 altBefore = usdc.balanceOf(alt);
        escrow.refundUnused(1);
        assertGt(usdc.balanceOf(alt), altBefore, "alt address received refund");
        assertEq(usdc.balanceOf(buyer), 1_000_000e6 - 100e6, "buyer balance unchanged");
    }

    // -----------------------------------------------------------------------
    // 12. emergencyRescuePayout
    // -----------------------------------------------------------------------

    function test_EmergencyRescuePayout_HappyPath() public {
        _fundDefaultDeal();

        address newPayee = makeAddr("newPayee");
        vm.prank(owner);
        escrow.emergencyRescuePayout(1, newPayee);

        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        assertEq(d.payee, newPayee, "payee updated");
    }

    function test_EmergencyRescuePayout_Revert_NotOwner() public {
        _fundDefaultDeal();

        vm.prank(rando);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, rando)
        );
        escrow.emergencyRescuePayout(1, makeAddr("x"));
    }

    function test_EmergencyRescuePayout_Revert_ZeroAddress() public {
        _fundDefaultDeal();

        vm.prank(owner);
        vm.expectRevert(MeteredEscrow.InvalidAddress.selector);
        escrow.emergencyRescuePayout(1, address(0));
    }

    function test_EmergencyRescuePayout_Revert_DealNotFunded() public {
        vm.prank(owner);
        vm.expectRevert(MeteredEscrow.DealNotFunded.selector);
        escrow.emergencyRescuePayout(999, makeAddr("x"));
    }

    // -----------------------------------------------------------------------
    // 13. pause / unpause
    // -----------------------------------------------------------------------

    function test_Pause_BlocksCreateAndFundDeal() public {
        vm.prank(owner);
        escrow.pause();

        MeteredEscrow.Terms memory t = _defaultTerms();
        (bytes memory bs, bytes memory ss,) = _signTerms(t);

        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.createAndFundDeal(t, bs, ss);
    }

    function test_Pause_BlocksSettleAcceptedUsage() public {
        bytes32 td = _fundDefaultDeal();

        vm.prank(owner);
        escrow.pause();

        MeteredEscrow.Acceptance memory a = _defaultAcceptance(td);
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);

        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.settleAcceptedUsage(1, a, sig);
    }

    function test_Pause_BlocksSellerCloseTerm() public {
        _fundDefaultDeal();

        vm.prank(owner);
        escrow.pause();

        vm.prank(seller);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.sellerCloseTerm(1);
    }

    function test_Pause_BlocksRefundUnused() public {
        _fundDefaultDeal();

        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        vm.warp(uint256(d.end) + uint256(d.grace) + 1);

        vm.prank(owner);
        escrow.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.refundUnused(1);
    }

    function test_Unpause_RestoresCreateAndFundDeal() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(owner);
        escrow.unpause();

        // Should succeed after unpause
        MeteredEscrow.Terms memory t = _defaultTerms();
        (bytes memory bs, bytes memory ss,) = _signTerms(t);
        escrow.createAndFundDeal(t, bs, ss); // no revert
    }

    function test_Pause_OnlyOwner() public {
        vm.prank(rando);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, rando)
        );
        escrow.pause();
    }

    function test_Unpause_OnlyOwner() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(rando);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, rando)
        );
        escrow.unpause();
    }

    // -----------------------------------------------------------------------
    // 14. renounceOwnership reverts
    // -----------------------------------------------------------------------

    function test_RenounceOwnership_Reverts() public {
        vm.prank(owner);
        vm.expectRevert(bytes("MeteredEscrow: renounce disabled"));
        escrow.renounceOwnership();
    }

    // -----------------------------------------------------------------------
    // 15. FUZZ: cumulative settlement never exceeds deposit
    // -----------------------------------------------------------------------

    function testFuzz_SettlementNeverExceedsDeposit(uint256 cumA, uint256 cumA2) public {
        bytes32 td = _fundDefaultDeal();
        uint256 deposit = escrow.getDeal(1).deposit; // 100e6

        // Bound first cumulative settlement to [1, deposit]
        cumA = bound(cumA, 1, deposit);

        MeteredEscrow.Acceptance memory a = MeteredEscrow.Acceptance({
            dealId:           1,
            termsHash:        td,
            cumulativeAmount: cumA,
            cumulativeUnits:  bound(cumA / 1e6 == 0 ? 1 : cumA / 1e6, 1, 100),
            receiptsRoot:     bytes32(0),
            nonce:            1,
            expiry:           uint64(block.timestamp + 1 hours)
        });
        (bytes memory sig,) = _signAcceptance(a, BUYER_PK);
        escrow.settleAcceptedUsage(1, a, sig);

        // Second settlement: cumulative must be > cumA and <= deposit
        if (cumA < deposit) {
            cumA2 = bound(cumA2, cumA + 1, deposit);

            MeteredEscrow.Acceptance memory a2 = MeteredEscrow.Acceptance({
                dealId:           1,
                termsHash:        td,
                cumulativeAmount: cumA2,
                cumulativeUnits:  bound(cumA2 / 1e6 == 0 ? 1 : cumA2 / 1e6, 1, 100),
                receiptsRoot:     bytes32(0),
                nonce:            2,
                expiry:           uint64(block.timestamp + 1 hours)
            });
            (bytes memory sig2,) = _signAcceptance(a2, BUYER_PK);
            escrow.settleAcceptedUsage(1, a2, sig2);
        }

        MeteredEscrow.Deal memory d = escrow.getDeal(1);
        assertLe(d.settled, deposit, "settled never exceeds deposit");
    }

    // -----------------------------------------------------------------------
    // 16. INVARIANT: deposit == settled + refunded + remaining
    // -----------------------------------------------------------------------
    // The invariant test exercises random sequences of settle/refund/close
    // and always checks the accounting identity.

    function testFuzz_Invariant_AccountingIdentity(
        uint256 cumAmount,
        bool doClose,
        bool doRefund
    ) public {
        // Fund a fresh deal
        bytes32 td = _fundDefaultDeal();
        uint256 deposit = escrow.getDeal(1).deposit;

        // Optionally settle some usage
        cumAmount = bound(cumAmount, 0, deposit);
        if (cumAmount > 0) {
            MeteredEscrow.Acceptance memory a = MeteredEscrow.Acceptance({
                dealId:           1,
                termsHash:        td,
                cumulativeAmount: cumAmount,
                cumulativeUnits:  bound(cumAmount / 1e6 == 0 ? 1 : cumAmount / 1e6, 1, 100),
                receiptsRoot:     bytes32(0),
                nonce:            1,
                expiry:           uint64(block.timestamp + 1 hours)
            });
            (bytes memory sig,) = _signAcceptance(a, BUYER_PK);
            escrow.settleAcceptedUsage(1, a, sig);
        }

        // Optionally close
        if (doClose) {
            vm.prank(seller);
            escrow.sellerCloseTerm(1);
        }

        // Optionally refund (only valid after close or end+grace)
        if (doRefund) {
            MeteredEscrow.Deal memory d = escrow.getDeal(1);
            bool canRefund = d.sellerClosed ||
                block.timestamp >= uint256(d.end) + uint256(d.grace);
            uint256 remainingBefore = d.deposit - d.settled - d.refunded;

            if (canRefund && remainingBefore > 0) {
                escrow.refundUnused(1);
            }
        }

        // Invariant: deposit == settled + refunded + remaining
        (uint256 dep, uint256 settled, uint256 refunded, uint256 remaining) = escrow.balances(1);
        assertEq(dep, settled + refunded + remaining, "accounting identity holds");
    }
}
