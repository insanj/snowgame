import io from 'socket.io-client';
const events = require('../strings/events.js');

const socketLog = (msg) => {
    console.log(`[SocketNetworker] ${msg}`);
}

export default class SocketNetworker {
    connect({ url, config, callbacks }) {
        this.url = url;
        this.config = config;
        this.callbacks = callbacks;

        this.internalConfig = {
            baseURL: process.env.VUE_APP_BACKEND_URL
        };
        
        this.socket = io(url, config);

        let eventsToHandlers = {};
        eventsToHandlers['connect'] = this.handleConnect;
        eventsToHandlers['disconnect'] = this.handleDisconnect;
        eventsToHandlers[events.connectSuccess] = this.handleConnectSuccess;
        eventsToHandlers[events.disconnectSuccess] = this.handleDisconnectSuccess;
        eventsToHandlers[events.setPlayerLocationSuccess] = this.handleSetPlayerLocationSuccess;
        eventsToHandlers[events.getPlayerLocationSuccess] = this.handleGetPlayerLocationSuccess;
        eventsToHandlers[events.getMapSuccess] = this.handleGetMapSuccess;
        eventsToHandlers[events.getMapPlayersSuccess] = this.handleGetMapPlayersSuccess;

        const referenceToThis = this;
        for (const [eventName, eventHandler] of Object.entries(eventsToHandlers)) {
            this.socket.on(eventName, function (data) {
                eventHandler.call(referenceToThis, data);
            });
        }

        socketLog("done assigning socket listeners")
        this.socket.connect();
    }

    getSocket() {
        if (!this.socket || typeof(this.socket) === 'undefined') {
            return null;
        }

        return this.socket;
    }
    
    emit(eventName, eventData) {
        const socket = this.getSocket();
        if (!socket.connected) {
            socketLog("socket reconnecting before emit");
            socket.connect();
        }

        socket.emit(eventName, eventData);
        socketLog("emitted " + eventName);
    }

    /* Private Functions */
    handleConnect() {
        socketLog("socket connected!")

        if (this.callbacks['connect']) {
            this.callbacks['connect']();
        }
    }

    handleDisconnect() {
        socketLog("socket disconnected, reconnecting...")
        this.socket.connect();

        const socket = this.getSocket();
        this.timer = setInterval(() => {
            if (socket.connected !== true) {
                socketLog("socket STILL disconnected, reconnecting...")
                socket.connect();
            } else {
                clearInterval(this.timer);
            }
        }, 1000);

        if (this.callbacks['disconnect']) {
            this.callbacks['disconnect']();
        }
    }

    handleConnectSuccess(data) {
        socketLog("connect success")

        if (this.callbacks[events.connectSuccess]) {
            this.callbacks[events.connectSuccess](data);
        }
    }

    handleDisconnectSuccess(data) {
        socketLog("disconnect success")

        if (this.callbacks[events.disconnectSuccess]) {
            this.callbacks[events.disconnectSuccess](data);
        }
    }

    handleSetPlayerLocationSuccess(data) {
        socketLog("set player location success")

        if (this.callbacks[events.setPlayerLocationSuccess]) {
            this.callbacks[events.setPlayerLocationSuccess](data);
        }
    }

    handleGetPlayerLocationSuccess(data) {
        socketLog("get player location success")

        if (this.callbacks[events.getPlayerLocationSuccess]) {
            this.callbacks[events.getPlayerLocationSuccess](data);
        }
    }

    handleGetMapSuccess(data) {
        socketLog("get map success")

        if (this.callbacks[events.getMapSuccess]) {
            this.callbacks[events.getMapSuccess](data);
        }
    }

    handleGetMapPlayersSuccess(data) {
        socketLog("get map players success")

        if (this.callbacks[events.getMapPlayersSuccess]) {
            this.callbacks[events.getMapPlayersSuccess](data);
        }
    }
}