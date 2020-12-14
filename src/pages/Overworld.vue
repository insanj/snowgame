<template>
    <div class="game">
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

            <div v-for="npc in npcs" :id="npc.name" :style="`top: ${npc.maptop}px; left: ${npc.mapleft}px;`" :key="npc.id">
                <img v-if="npc.name === 'tall_boy'" src="@/assets/tall_boy.png" :class="npc.name" />
            </div>

            <div v-for="npc in activatedNPCs" :key="npc.name" class="npc-activation" :style="heightForActivatedNPC(npc)">
                <div class="npc-text" v-html="activatedNPCHTML" />

                <div class="npc-button" v-if="activatedNPCButtonVisible">
                    <div class="npc-button-text">Yes</div>
                    <img src="../assets/spacebar.png" class="npc-button-spacebar" />
                </div>
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

            originalSoundtrackTime: 0,
            activatedSoundtrackTimes: {},
            soundtrack: null,

            timeouts: [],

            // parsed backend for frontend purposes (also reactive because shallow)
            mapName: null,
            playerTop: 0,
            playerLeft: 0,
            facing: null,
            mapWidth: 0,
            mapHeight: 0,
            
            activatedNPCHTML: '',
            activatedNPCButtonVisible: false,

            // todo, needs to be shallower
            players: null,
            npcs: null,
            activatedNPCs: [],

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

        const randomSound = `/static/ambient_sparkles_background.mp3`;
        this.soundtrack = new Audio(randomSound);
        this.soundtrack.play();
        
        window.onblur = () => {
            this.handleWindowLoseFocus();
        }

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

            else if (event.keyCode === 32) { // spacebar
                this.handleSpacebarUnpressed();
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
        heightForActivatedNPC(npc) {
            const mapTopInt = parseInt(npc.maptop, 10);
            const npcElement = document.getElementById(npc.name);
            if (!npcElement || npc.name !== 'tall_boy') {
                return `top: ${npc.maptop}px; left: ${npc.mapleft}px; `;
            }

            const heightOfNPC = npcElement.clientHeight;
            const topOffset = (mapTopInt + heightOfNPC) - 320;
            const leftOffset = parseInt(npc.mapleft, 10) - 240;
            return `top: ${topOffset}px; left: ${leftOffset}px; `;
        },
        generatePlayerStyle() {
            let styles = `top: ${this.playerTop}px; left: ${this.playerLeft}px;`;

            if (this.npcs && this.npcs.length > 0) {
                for (let npc of this.npcs) {
                    const { maptop } = npc;

                    const mapTopInt = parseInt(maptop, 10);
                    const npcElement = document.getElementById(npc.name);
                    if (!npcElement) {
                        continue;
                    }

                    const heightOfNPC = npcElement.clientHeight;
                    const topOffset = (mapTopInt + heightOfNPC) - 50;

                    if (this.playerTop > topOffset) {
                        styles = `${styles} z-index: 100;`;
                    } else {
                        // do nothing be hidden
                    }
                }
            }

            return styles;
        },

        generateMapStyle() {
            return `width: ${this.mapWidth}px; height: ${this.mapHeight}px;`;
        },

        /* triggers */
        triggerActivatedNPCs() {
            if (!this.activatedNPCs || this.activatedNPCs.length < 1) {
                return;
            }

            // tall_boy check
            if (this.activatedNPCs.find(npc => npc.name === 'tall_boy')) {
                let i = 0;

                this.activatedNPCHTML = '';

                const tallBoyText = "Pretty cold down there, isn't it?\n\nI used to be small like you. Ha!\n\n";
                const boldTallBoyText = "Do you wanna be like me?";
                
                const addBoldLetters = (completion) => {
                    if (i > boldTallBoyText.length-1) {
                        this.activatedNPCButtonVisible = true;
                        return;
                    }

                    this.activatedNPCHTML = `${tallBoyText}<b>${boldTallBoyText.slice(0, i + 1)}</b>`
                    i = i + 1;

                    const newTimeout = setTimeout(() => {
                        completion(completion);
                    }, 50);
                    this.timeouts.push(newTimeout);
                }

                const addOneMoreLetter = (completion) => {
                    if (i > tallBoyText.length) {
                        i = 0;
                        addBoldLetters(addBoldLetters);
                        return;
                    }

                    this.activatedNPCHTML = `${tallBoyText.slice(0, i+1)}`
                    i = i + 1;

                    const newTimeout = setTimeout(() => {
                        completion(completion);
                    }, 50);
                    this.timeouts.push(newTimeout);
                }

                addOneMoreLetter(addOneMoreLetter);

                this.originalSoundtrackTime = this.soundtrack.currentTime;
                this.soundtrack.pause();
                this.soundtrack.src = '';
                
                const tallboySound = `/static/ambient_jazz_tallboy.mp3`;
                this.soundtrack = new Audio(tallboySound);
                this.soundtrack.volume = 0.3;
                this.soundtrack.loop = true;
                this.soundtrack.load();

                this.soundtrack.addEventListener("canplaythrough", () => {
                    if (!this.soundtrack.paused) {
                        return;
                    }

                    if (this.soundtrack.duration && this.activatedSoundtrackTimes['tall_boy']) {
                        const lastTallBoyTime = this.activatedSoundtrackTimes['tall_boy'];
                        this.soundtrack.currentTime = lastTallBoyTime < this.soundtrack.duration ? lastTallBoyTime : 0;
                    } else {
                        this.soundtrack.currentTime = 0;
                    }

                    this.soundtrack.play();
                }, false);
            }
        },

        untriggerActivatedNPCs() {
            if (!this.activatedNPCs || this.activatedNPCs.length < 1) {
                return;
            }
           
           if (this.activatedNPCs.find(npc => npc.name === 'tall_boy')) {
               if (this.timeouts) {
                   for (let t of this.timeouts) {
                       clearTimeout(t);
                   }
               }

                this.activatedSoundtrackTimes['tall_boy'] = this.soundtrack.currentTime;
                this.soundtrack.pause();
                this.soundtrack.currentTime = 0;
                this.soundtrack.src = '';

                const randomSound = `/static/ambient_sparkles_background.mp3`;
                this.soundtrack = new Audio(randomSound);
                this.soundtrack.volume = 1.0;
                this.soundtrack.load();

                this.soundtrack.addEventListener("canplaythrough", () => {
                    if (!this.soundtrack.paused) {
                        return;
                    }

                    this.soundtrack.currentTime = this.originalSoundtrackTime;
                    this.soundtrack.play();
                });
            }

            this.activatedNPCs = [];
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
        handleWindowLoseFocus() {
            this.upPressed = false;
            this.downPressed = false;
            this.leftPressed = false;
            this.rightPressed = false;    
        },

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

        handleSpacebarUnpressed() {
            if (this.activatedNPCs && this.activatedNPCs.length > 0) {
                this.untriggerActivatedNPCs();
                return;
            }

            if (!this.npcs || this.npcs.length < 1) {
                return;
            }
            
            const npcsInRange = this.npcs.filter(npc => {
                const { mapleft, maptop, range } = npc;

                const diffHorizonally = Math.abs(parseInt(mapleft, 10) - this.playerLeft);

                const mapTopInt = parseInt(maptop, 10);
                const npcElement = document.getElementById(npc.name);
                if (!npcElement) {
                    return false;
                }

                const heightOfNPC = npcElement.clientHeight;
                const topOffset = mapTopInt + heightOfNPC;

                const diffVertically = Math.abs(topOffset - this.playerTop);
                
                const rangeInt = parseInt(range, 10);

                if (diffHorizonally <= rangeInt && diffVertically <= rangeInt) {
                    return true;
                }

                return false;
            });
            
            this.activatedNPCs = npcsInRange ? npcsInRange : [];
            this.triggerActivatedNPCs();
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
                this.npcs = map.npcs;

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

            let existing = this.players ? this.players.find(p => p.username === username) : null;
            if (!existing) {
                socketNetworker.emit(events.getMapPlayers, {
                    mapname: this.mapName
                });

                return;
            } 

            existing.location = location;

            let updatedPlayers = this.players.filter(p => p.username !== username);
            updatedPlayers.push(existing);
            this.players = updatedPlayers;
        },

        socketGetMapPlayersSuccess(data) {
            const { players, mapname } = data;
            if (this.mapName !== mapname) {
                return; // ignore map that isn't the same as ours
            }

            const updated = players.filter(p => p.username !== this.username);
            let merged = this.players ? this.players : [];
            for (let player of updated) {
                const index = merged.findIndex(p => p.id === player.id);
                if (index > -1) {
                    merged[index] = player;
                } else {
                    merged.push(player);
                }
            }
            
            this.players = merged;
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

.game {

}

@keyframes mapBackgroundAnimation {
    0% {
        background-position: 0% 0%;
    }
    20% {
        background-position: 100% 0%;
    }
    40% {
        background-position: 100% 100%;
    }
    60% {
        background-position: 0% 100%;
    }
    80% {
        background-position: 0% 0%;
    }
}

#map {
    z-index: 0;
    position: fixed;
    cursor: url('/favicon.ico'), auto;

    top: 0;
    left: 0;

    opacity: 0.3;
    background: rgba(255, 255, 255, 1);
    background-image: url('../assets/snow_gradient.png');
    background-position: 0% 0%;
    background-size: 1000% 1000%;
    background-repeat: no-repeat;
    background-attachment: fixed;

    animation: mapBackgroundAnimation 20s infinite;

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

#tall_boy { /* container */
    z-index: 50;
    pointer-events: none;
    position: fixed;

    font-size: 0px;

    transition: 0.5s ease-out;
}

.tall_boy { /* the boy himself */
    width: 56px;
    height: auto;

    object-fit: contain;
}

@keyframes activationAnimation {
    0% {
        opacity: 0.0;
        transform: scale(0.3, 0.3) ;
        margin-top: -100px;
    }
    5% {
        opacity: 1.0;
    }
    50% {
        margin-top: 0px;
    }
    90% {
        transform: scale(1.07, 1.07);
    }
    100% {
        transform: scale(1, 1);
    }
}

.npc-activation {
    pointer-events: none;

    z-index: 5000;
    position: fixed;

    width: 600px;
    height: 235px;

    box-shadow: 0px 1px 10px rgba(0,0,0,0.1);

    background-image: url('../assets/text_box.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
       
    animation: activationAnimation 1s ease-in-out;
}

.npc-text {
    padding: 20px;
    font-family: cursive;
    font-size: 24px;
    text-align: left;

    white-space: pre-line;
    line-height: 1;
}

.npc-button {
    position: absolute;

    font-family: 'Montserrat', Avenir, Helvetica, Arial, sans-serif;
    text-align: left;
    font-weight: 700;
    font-size: 28px;

    bottom: 8px;
    left: 24px;
}

.npc-button-text {
    display: inline;
    vertical-align: middle;
}

.npc-button-spacebar {
    margin-left: 10px;

    width: 170px;
    height: 50px;
    object-fit: contain;
    
    display: inline;
    vertical-align: middle;
}

</style>