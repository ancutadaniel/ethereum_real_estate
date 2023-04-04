//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}

contract Escrow {
    address public nftAddress;
    address payable public seller;
    address public lender;
    address public inspector;

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    // fallback function - called if other functions don't match call or ether is sent without data
    fallback() external payable {}

    // similar to a catch statement in solidity 0.4.0
    receive() external payable {}

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }

    modifier onlyBuyer(uint256 _nftId) {
        require(
            msg.sender == buyer[_nftId],
            "Only buyer can call this function"
        );
        _;
    }

    modifier onlyLender() {
        require(msg.sender == lender, "Only lender can call this function");
        _;
    }

    modifier onlyInspector() {
        require(
            msg.sender == inspector,
            "Only inspector can call this function"
        );
        _;
    }

    // Seller lists NFT for sale
    function list(
        uint256 _nftId,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable onlySeller {
        require(isListed[_nftId] == false, "NFT is already listed");
        // transfer nft to this contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftId);
        isListed[_nftId] = true;
        purchasePrice[_nftId] = _purchasePrice;
        escrowAmount[_nftId] = _escrowAmount;
        buyer[_nftId] = _buyer;
    }

    // Update Inspection Status(Inspection Passed) only by inspector
    function updateInspectionStatus(uint256 _nftId, bool _inspectionPassed)
        public
        onlyInspector
    {
        inspectionPassed[_nftId] = _inspectionPassed;
    }

    // Put Under Contract (PUC) - Buyer pays escrow amount
    function depositEarnest(uint256 _nftId) public payable onlyBuyer(_nftId) {
        require(
            msg.value >= escrowAmount[_nftId],
            "Deposit amount is incorrect"
        ); // down payment
    }

    // Approve Sale - Buyer approves sale
    function approveSale(uint256 _nftId) public {
        approval[_nftId][msg.sender] = true;
    }

    // Get balance of contract
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Finalize Sale - Seller approves sale
    // -> Requires inspection to be passed(add more items to check, like appraisal, etc)
    // -> Requires sale to be authorized
    // -> Requires funds to be correct amount
    // -> Transfer NFT to buyer
    // -> Transfer funds to seller
    function finalizeSale(uint256 _nftId) public payable onlySeller {
        require(
            inspectionPassed[_nftId] == true,
            "Inspection has not been passed"
        );
        require(
            approval[_nftId][buyer[_nftId]] == true,
            "Sale buyer has not been authorized"
        );
        require(
            approval[_nftId][seller] == true,
            "Sale seller has not been authorized"
        );
        require(
            approval[_nftId][lender] == true,
            "Sale lender has not been authorized"
        );
        require(
            address(this).balance >= purchasePrice[_nftId],
            "Purchase price is incorrect"
        );

        // nft no longer listed
        isListed[_nftId] = false;

        // transfer funds form contract to seller
        (bool success, ) = payable(seller).call{value: address(this).balance}(
            ""
        );
        require(success, "Transfer failed.");

        // transfer nft to buyer
        IERC721(nftAddress).transferFrom(address(this), buyer[_nftId], _nftId);
    }

    // Cancel Sale (handle earnest deposit refund)
    // if inspection status ins not approved, then refund earnest deposit, otherwise send to seller
    function cancelSale(uint256 _nftId) public {
        if (inspectionPassed[_nftId] == false) {
            payable(buyer[_nftId]).transfer(address(this).balance);
        } else {
            payable(seller).transfer(address(this).balance);
        }
    }
}
