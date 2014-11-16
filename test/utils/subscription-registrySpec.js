var SubscriptionRegistry = require( '../../src/utils/subscription-registry' ),
	SocketMock = require( '../mocks/socket-mock' ),
	SocketWrapper = require( '../../src/message/socket-wrapper' ),
	lastLogEvent = null,
	options = { logger: { log: function( level, event, message ){ lastLogEvent = event; } } },
	subscriptionRegistry = new SubscriptionRegistry( options );

describe( 'subscription-registry manages subscriptions', function(){

	var socketWrapperA = new SocketWrapper( new SocketMock() ),
		socketWrapperB = new SocketWrapper( new SocketMock() );

	it( 'subscribes to names', function(){
		expect( socketWrapperA.socket.lastSendMessage ).toBe( null );

		subscriptionRegistry.subscribe( 'someName', socketWrapperA );
		subscriptionRegistry.sendToSubscribers( 'someName', 'someMessage' );

		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'someMessage' );
	});

	it( 'doesn\'t subscribe twice to the same name', function(){
		expect( lastLogEvent ).toBe( null );
		subscriptionRegistry.subscribe( 'someName', socketWrapperA );
		expect( lastLogEvent ).toBe( 'MULTIPLE_SUBSCRIPTIONS' );
	});

	it( 'distributes messages to multiple subscribers', function(){
		subscriptionRegistry.subscribe( 'someName', socketWrapperB );
		subscriptionRegistry.sendToSubscribers( 'someName', 'msg2' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg2' );
		expect( socketWrapperB.socket.lastSendMessage ).toBe( 'msg2' );
	});

	it( 'doesn\'t send message to sender', function(){
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg2' );
		expect( socketWrapperB.socket.lastSendMessage ).toBe( 'msg2' );
		subscriptionRegistry.sendToSubscribers( 'someName', 'msg3', socketWrapperA );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg2' );
		expect( socketWrapperB.socket.lastSendMessage ).toBe( 'msg3' );
	});

	it( 'unsubscribes', function(){
		subscriptionRegistry.sendToSubscribers( 'someName', 'msg4' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg4' );
		expect( socketWrapperB.socket.lastSendMessage ).toBe( 'msg4' );

		subscriptionRegistry.unsubscribe( 'someName', socketWrapperB );
		subscriptionRegistry.sendToSubscribers( 'someName', 'msg5' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg5' );
		expect( socketWrapperB.socket.lastSendMessage ).toBe( 'msg4' );
	});

	it( 'routes the events', function(){
		subscriptionRegistry.subscribe( 'someOtherName', socketWrapperA );
		subscriptionRegistry.sendToSubscribers( 'someOtherName', 'msg6' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg6' );

		subscriptionRegistry.sendToSubscribers( 'someName', 'msg7' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg7' );

		subscriptionRegistry.unsubscribe( 'someName', socketWrapperA );
		subscriptionRegistry.sendToSubscribers( 'someName', 'msg8' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg7' );

		subscriptionRegistry.sendToSubscribers( 'someOtherName', 'msg9' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msg9' );
	});

	it( 'removes all subscriptions on socket.close', function(){
		subscriptionRegistry.subscribe( 'nameA', socketWrapperA );
		subscriptionRegistry.subscribe( 'nameB', socketWrapperA );
		
		subscriptionRegistry.sendToSubscribers( 'nameA', 'msgA' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msgA' );

		subscriptionRegistry.sendToSubscribers( 'nameB', 'msgB' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msgB' );

		socketWrapperA.socket.emit( 'close' );

		subscriptionRegistry.sendToSubscribers( 'nameA', 'msgC' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msgB' );

		subscriptionRegistry.sendToSubscribers( 'nameB', 'msgD' );
		expect( socketWrapperA.socket.lastSendMessage ).toBe( 'msgB' );
	});
});