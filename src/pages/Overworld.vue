<template>
    <div>
        <div v-if="socketMap && socketPlayerLocation" id="map" :style="mapStyle">
        </div>

        <div v-if="socketMap && socketPlayerLocation" id="player" :style="playerStyle">
            <img src="@/assets/SNOWHEAD_1.png" class="snowhead" />
            <div class="nametag">{{ username }}</div>
        </div>

        <div id="player" v-else>
            ⏳
        </div>
        
        <div v-if="socketMap && socketPlayerLocation && players && players.length > 0">
            <div v-for="player in players" id="player" :style="`top: ${player.location.maptop}px; left: ${player.location.mapleft}px;`" :key="player.id">
                <img src="@/assets/SNOWHEAD_1.png" class="snowhead" />
                <div class="nametag">{{ player.username }}</div>
            </div>
        </div>
    </div>
</template>

<script>
import SocketNetworker from '../backend/SocketNetworker.js';
import events from '../strings/events.js';

const socketNetworker = new SocketNetworker();
// const VUE_APP_FRONTEND_URL = process.env.VUE_APP_FRONTEND_URL;

export default {
    name: "Overworld",
    props: ['networker', 'username', 'token', 'initialMapName'],
    data() {
        return {
            // backend
            socketMap: null,
            socketPlayerLocation: null,
            socketPlayerLocationFromMap: false,

            // parsed backend for frontend purposes (also reactive because shallow)
            mapName: null,
            playerTop: 0,
            playerLeft: 0,
            facing: null,
            mapWidth: 0,
            mapHeight: 0,
            players: null,

            // frontend
            mapStyle: 'width: 0px; height: 0px;',
            playerStyle: 'top: 0px; left: 0px;'
        }
    },
    mounted() {
        if (!this.initialMapName) {
            alert("Sorry, we can't play right now :(")
            return;
        }

        this.mapName = this.initialMapName;

        const randomSound = `/static/title_music_1.mp3`;
        const soundtrack = new Audio(randomSound);
        soundtrack.loop = true; 
        soundtrack.play();

        window.addEventListener('keydown', event => {
            if (event.keyCode === 38) { 
                this.handleUpPressed();
            } else if (event.keyCode === 37) {
                this.handleLeftPressed();
            } else if (event.keyCode === 39) {
                this.handleRightPressed();
            } else if (event.keyCode === 40) {
                this.handleDownPressed();
            }
        });

        window.addEventListener('keyup', event => {
            if (event.keyCode === 38) { 
                this.handleUpUnpressed();
            } else if (event.keyCode === 37) {
                this.handleLeftUnpressed();
            } else if (event.keyCode === 39) {
                this.handleRightUnpressed();
            } else if (event.keyCode === 40) {
                this.handleDownUnpressed();
            }
        })

        // setup socket
        const socketURL = process.env.VUE_APP_BACKEND_URL;
        const socketConfig = {
            transports: ['websocket'],
            query: { token: this.token },
            autoConnect: true,
            forceNew: true,
            reconnect: true,
        };

        let socketCallbacks = {};
        socketCallbacks[events.connectSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks connectSuccess");
            this.socketConnectSuccess(data);
        };

        socketCallbacks[events.disconnectSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks disconnectSuccess");
            this.socketDisconnectSuccess(data);
        };

        socketCallbacks[events.setPlayerLocationSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks setPlayerLocationSuccess");
            this.socketSetPlayerLocationSuccess(data);
        };

        socketCallbacks[events.getPlayerLocationSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks getPlayerLocationSuccess");
            this.socketGetPlayerLocationSuccess(data);
        };

        socketCallbacks[events.getMapSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks getMapSuccess");
            this.socketGetMapSuccess(data);
        };

        socketCallbacks[events.getMapPlayersSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks getMapPlayersSuccess");
            this.socketGetMapPlayersSuccess(data);
        };

        socketNetworker.connect({
            url: socketURL,
            config: socketConfig,
            callbacks: socketCallbacks
        });

        // start ticking to buffer all input and such, will not actually do anything until map & player loaded
        setInterval(() => {
            this.tick()
        }, 100);
    },
    methods: {
        generatePlayerStyle() {
            return `top: ${this.playerTop}px; left: ${this.playerLeft}px;`;
        },

        generateMapStyle() {
            return `width: ${this.mapWidth}px; height: ${this.mapHeight}px;`;
        },

        /* frontend */
        /** pressed */
        handleUpPressed() {
            this.upPressed = true;
        },

        handleDownPressed() {
            this.downPressed = true;
        },

        handleLeftPressed() {
            this.leftPressed = true;
        },

        handleRightPressed() {
            this.rightPressed = true;
        },

        /** unpressed */
        handleUpUnpressed() {
            this.upPressed = false;
        },

        handleDownUnpressed() {
            this.downPressed = false;
        },

        handleLeftUnpressed() {
            this.leftPressed = false;
        },

        handleRightUnpressed() {
            this.rightPressed = false;
        },

        /* tick */
        tick() {
            let somethingPressed = false;
            if (this.upPressed) {
                this.playerTop = Math.min(Math.max(this.playerTop - 10, 0), this.mapHeight - 50);
                somethingPressed = true;
            }

            if (this.downPressed) {
                this.playerTop = Math.min(Math.max(this.playerTop + 10, 0), this.mapHeight - 50);
                somethingPressed = true;
            }

            if (this.leftPressed) {
                this.playerLeft = Math.min(Math.max(this.playerLeft - 10, 0), this.mapWidth - 50);
                somethingPressed = true;
            }

            if (this.rightPressed) {
                this.playerLeft = Math.min(Math.max(this.playerLeft + 10, 0), this.mapWidth - 50);
                somethingPressed = true;
            }

            this.playerStyle = this.generatePlayerStyle();

            if (somethingPressed) {
                this.socketSetPlayerLocation({
                    username: this.username,
                    location: {
                        maptop: `${this.playerTop}`,
                        mapleft: `${this.playerLeft}`,
                        mapname: this.mapName,
                        facing: this.facing,
                    }
                });
            }
        },

        /* socket receiving end */
        socketConnectSuccess(data) {
            console.log(`[Overworld.vue] socketConnectSuccess ${data}`);
            const { username } = data;

            if (username !== this.username) {
                console.log(`[Overworld.vue] ${username} logged in, wasn't me!`);
                return;
            }

            if (!this.socketMap || !this.socketPlayerLocation) {
                this.socketGetPlayerLocation({
                    username
                });
            }
        },

        socketDisconnectSuccess(data) {
            console.log(`[Overworld.vue] socketDisconnectSuccess ${data}`);
            // const { username } = data.data;
        },
        
        socketGetPlayerLocationSuccess(data) {
            console.log(`[Overworld.vue] socketGetPlayerLocationSuccess ${data}`);
            const { username, location } = data;

            if (username !== this.username) {
                return;
            }

            if (this.socketPlayerLocation) {
                this.socketPlayerLocation = location;
                return;
            }
            
            if (!location) {
                this.socketPlayerLocationFromMap = true;
            } else {
                this.socketPlayerLocationFromMap = false;
                this.socketPlayerLocation = location;
            }

            if (!this.socketMap) {
                this.socketGetMap({
                    mapname: this.mapName
                });
            }
        },

        socketGetMapSuccess(data) {
            const { map } = data;
            if (this.mapName !== map.mapname) {
                return; // ignore map that isn't the same as ours
            }

            if (!this.socketPlayerLocation) {
                if (this.socketPlayerLocationFromMap) {
                    this.socketPlayerLocationFromMap = false;
                    const startingLocation = {
                        maptop: map.startinglocationtop,
                        mapleft: map.startinglocationleft,
                        facing: map.startinglocationfacing,
                        mapname: map.mapname
                    };

                    this.socketPlayerLocation = startingLocation;
                } else {
                    // assume we are still loading? /shrug
                }
            }

            if (!this.socketMap) {
                this.socketMap = map;

                this.mapWidth = map.width;
                this.mapHeight = map.height;

                this.mapStyle = this.generateMapStyle();
            }

            if (!this.socketPlayerLocation) {
                return;
            }
    
            this.playerTop = parseInt(this.socketPlayerLocation.maptop, 10);
            this.playerLeft = parseInt(this.socketPlayerLocation.mapleft, 10);
            this.mapName = this.socketPlayerLocation.mapname;
            this.facing = this.socketPlayerLocation.facing;

            this.playerStyle = this.generatePlayerStyle();
        },

        socketSetPlayerLocationSuccess(data) {
            const { username, location } = data;
            console.log(`[Overworld.vue] socketSetPlayerLocationSuccess ${username} ${location}`);

            if (this.username === username || location.mapname !== this.mapName) {
                return;
            }

            socketNetworker.emit(events.getMapPlayers, {
                mapname: this.mapName
            });
        },

        socketGetMapPlayersSuccess(data) {
            const { players, mapname } = data;
            if (this.mapName !== mapname) {
                return; // ignore map that isn't the same as ours
            }

            this.players = players.filter(p => p.username !== this.username);
        },

        /* socket sending end */
        socketGetMap({ mapname }) {
            if (!mapname) {
                console.log("Missing parameters");
                return;
            }

            socketNetworker.emit(events.getMap, {
                mapname
            });

            socketNetworker.emit(events.getMapPlayers, {
                mapname
            });
        },

        socketSetPlayerLocation({ username, location }) {
            const { mapname, maptop, mapleft, facing } = location;
            if (!mapname || !maptop || !mapleft || !facing) {
                console.log("Missing parameters");
                return;
            }

            socketNetworker.emit(events.setPlayerLocation, {
                username, location
            });
        },

        socketGetPlayerLocation({ username }) {
            socketNetworker.emit(events.getPlayerLocation, {
                username
            });
        },

        // socketGetMapPlayers({ mapname }) {
        //     if (!mapname) {
        //         console.log("Missing parameters");
        //         return;
        //     }

        //     socketNetworker.emit(events.getMapPlayers, {
        //         mapname
        //     });
        // },
    }
}
</script>

<style scoped>

#map {
    z-index: 0;
    pointer-events: none;
    position: fixed;

    top: 0;
    left: 0;

    border: 1px solid black;

    background: rgba(240, 255, 255, 1);
    overflow: hidden;
}

#player {
    pointer-events: none;
    position: fixed;

    font-size: 60px;

    transition: 0.5s ease-out;
}

.snowhead {
    width: 50px;
    height: 50px;

    object-fit: contain;
    
}

.nametag {
    font-size: 18px;
    font-weight: 800;
    line-height: 1;
}

</style>