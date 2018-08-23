pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";

// @title PrepayTimeIntervalOpenRentable
contract OpenRentableToken is ERC721Token {

  /**
      STORAGE
  */

  // @dev default rental price (in Wei)
  uint256 public DEFAULT_RENTAL_PRICE_WEI = 0;

  // @dev mapping for storing the rental price for a token
  mapping (uint256 => uint256) public rentalPrices;

  // @dev default minimum unit of rent is one day (in seconds)
  uint256 public DEFAULT_RENTAL_TIME_INTERVAL = 3600*24;

  // @dev mapping for storing the rental time interval for a token
  mapping (uint256 => uint256) public rentalTimeIntervals;

  // @dev mapping for basic reservations: tokenId => _time => renter
  mapping (uint256 => mapping (uint256 => address)) public reservations;

  /**
      EVENTS
  */

  /// @dev This emits when a successful reservation is made for accessing any NFT.
  event Reserve(address indexed _renter, uint256 _tokenId, uint256 _start, uint256 _stop);

  /// @dev This emits when a successful cancellation is made for a reservation.
  // event CancelReservation(address indexed _renter, uint256 _tokenId, uint256 _start, uint256 _stop);

  /**
     ERC-721 FUNCTIONS
  */

  constructor(string name, string symbol) public
    ERC721Token(name, symbol)
  { }

  function mint(address _to, uint256 _tokenId) public {
    super._mint(_to, _tokenId);
  }

  function mintWithPrice(address _to, uint256 _tokenId, uint256 _newPrice) public {
    mint(_to, _tokenId);
    rentalPrices[_tokenId] = _newPrice;
  }

  function burn(uint256 _tokenId) public {
    super._burn(ownerOf(_tokenId), _tokenId);
  }

  function exists(uint256 _tokenId) public view returns (bool) {
    return super.exists(_tokenId);
  }

  function setTokenURI(uint256 _tokenId, string _uri) public {
    super._setTokenURI(_tokenId, _uri);
  }

  function _removeTokenFrom(address _from, uint256 _tokenId) public {
    super.removeTokenFrom(_from, _tokenId);
  }

  /**
     ERC-809 FUNCTIONS
  */

  // @dev Set the rental price for a token
  function setRentalPrice(uint256 _tokenId, uint256 _newPrice) external {
    require(msg.sender == tokenOwner[_tokenId]);
    rentalPrices[_tokenId] = _newPrice;
  }

  // @dev Lookup to get the rental price for a token
  function getRentalPrice(uint256 _tokenId)
  public
  view
  returns (uint256)
  {
    if(rentalPrices[_tokenId] == 0) {
      return DEFAULT_RENTAL_PRICE_WEI;
    }
    return rentalPrices[_tokenId];
  }

  // @dev Set the rental time interval for a token
  function setRentalTimeInterval(uint256 _tokenId, uint256 _newInterval) external {
    require(msg.sender == tokenOwner[_tokenId]);
    rentalTimeIntervals[_tokenId] = _newInterval;
  }

  // @dev Lookup to get the rental time interval for a token
  function getRentalTimeInterval(uint256 _tokenId)
  public
  view
  returns (uint256)
  {
    if(rentalTimeIntervals[_tokenId] == 0) {
      return DEFAULT_RENTAL_TIME_INTERVAL;
    }
    return rentalTimeIntervals[_tokenId];
  }

  /// @notice Find the renter of an NFT token as of `_time`
  /// @dev The renter is who made a reservation on `_tokenId` and the reservation spans over `_time`.
  function getRenter(uint256 _tokenId, uint256 _time) 
  public
  view
  returns (address)
  {
    uint256 time = _convertTime(_tokenId, _time);
    return reservations[_tokenId][time];
  }

  /// @notice Reserve access to token `_tokenId` from time `_start` to time `_stop`
  /// @dev A successful reservation must ensure each time slot in the range _start to _stop
  ///  is not previously reserved (by calling the function checkAvailable() described below)
  ///  and then emit a Reserve event.
  function reserve(uint256 _tokenId, uint256 _start, uint256 _stop)
  payable
  external
  returns (bool)
  {
    require(getRentalPrice(_tokenId) <= msg.value);
    require(_isFuture(_start));
    require(checkAvailable(_tokenId, _start, _stop));

    uint256 start = _convertTime(_tokenId, _start);
    uint256 stop = _convertTime(_tokenId, _stop);
    require(start <= stop);

    // make payment
    address(tokenOwner[_tokenId]).transfer(msg.value);

    // make reservation
    for (uint i = start; i <= stop; i++) {
      reservations[_tokenId][i] = msg.sender;
    }

    emit Reserve(
      msg.sender, 
      _tokenId,
      start,
      stop
    );

    return true;
  }

  /// @notice Revoke access to token `_tokenId` from `_renter` and settle payments
  /// @dev This function should be callable by either the owner of _tokenId or _renter,
  ///  however, the owner should only be able to call this function if now >= _stop to
  ///  prevent premature settlement of funds.
  // function settle(uint256 _tokenId, address _renter, uint256 _stop) external returns (bool success);

  /// @notice Query if token `_tokenId` if available to reserve between `_start` and `_stop` time
  function checkAvailable(uint256 _tokenId, uint256 _start, uint256 _stop)
  public
  view
  returns (bool available)
  {
    uint256 start = _convertTime(_tokenId, _start);
    uint256 stop = _convertTime(_tokenId, _stop);

    for (uint i = start; i <= stop; i++) {
      if (! _isAvailable(_tokenId, i)) {
        return false;
      }
    }
    return true;
  }

  /// @notice Cancel reservation for `_tokenId` between `_start` and `_stop`
  /// @dev Reservation for that `_tokenId` between `_start` and `_stop` is cancelled. If no single reservation
  ///         is found with that `_start` and `_stop`, then nothing is cancelled.
  function cancelReservation(uint256 _tokenId, uint256 _start, uint256 _stop)
  external
  returns (bool success)
  {
    require(msg.sender == tokenOwner[_tokenId]);
    return _cancelReservation(_tokenId, _start, _stop);
  }

  /**
    INTERNAL FUNCTIONS
  */

  // @dev cancel the given reservation
  function _cancelReservation(uint256 _tokenId, uint256 _start, uint256 _stop)
  internal
  returns (bool success)
  {
    uint256 start = _convertTime(_tokenId, _start);
    uint256 stop = _convertTime(_tokenId, _stop);

    for (uint i = start; i <= stop; i++) {
      reservations[_tokenId][i] = address(0);
    }

    return true;
  }

  // @dev check availability
  function _isAvailable(uint256 _tokenId, uint256 _time) internal view returns (bool) {
    return reservations[_tokenId][_time] == address(0);
  }

  // @dev internal check if reservation date is _isFuture
  function _isFuture(uint256 _time) internal view returns (bool future) {
    return _time>=now;
  }

  // @dev convert _time to a multiple of rental time interval
  function _convertTime(uint256 _tokenId, uint256 _time)
  internal
  view
  returns (uint256 _newTime)
  {
    uint rentalTimeInterval = getRentalTimeInterval(_tokenId);
    return _time/rentalTimeInterval;
  }
}