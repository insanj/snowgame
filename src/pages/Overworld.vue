<template>
    <div class="game">
        <div v-if="socketMap && socketPlayerLocation" id="map" :style="mapStyle">
        </div>

        <div v-if="socketMap && socketPlayerLocation" id="player" :style="playerStyle">
            <img src="@/assets/SNOWHEAD_1.png" class="snowhead" :style="snowheadStyle" />
            <div class="nametag">{{ username }}</div>
        </div>

        <div id="player" v-else>
            ⏳
        </div>
        
        <div v-if="socketMap && socketPlayerLocation && players && players.length > 0">
            <div v-for="player in players" id="player" :style="`top: ${player.location.maptop}px; left: ${player.location.mapleft}px;`" :key="player.id">
                <img src="@/assets/SNOWHEAD_1.png" class="snowhead" :style="`transform: rotate(${player.location.facing}deg)`" />
                <div class="nametag">{{ player.username }}</div>
            </div>

            <div v-for="npc in npcs" :id="npc.name" :style="`top: ${npc.maptop}px; left: ${npc.mapleft}px;`" :key="npc.id">
                <img v-if="npc.name === 'tall_boy'" src="@/assets/tall_boy.png" :class="npc.name" />
            </div>

            <div v-if="activatedNPCHTML">
                <div v-for="npc in activatedNPCs" :key="npc.name" class="npc-activation" :style="heightForActivatedNPC(npc)">
                    <div class="npc-text" v-html="activatedNPCHTML" />

                    <div v-if="activatedNPCButtonVisible">
                        <div v-for="answer in activatedInteraction.answers" class="npc-button" :key="answer.id">
                            <div v-if="answer.text" class="npc-button-text">{{ answer.text }}</div>
                            <img v-if="answer.image" :src="`/static/${answer.image}.png`" class="npc-button-spacebar" />
                        </div>
                    </div>
                </div>
            </div>

            <div v-for="feature in mapFeatures" :key="feature.name" class="map-feature" :style="`top: ${feature.maptop}px; left: ${feature.mapleft}px;`">
                <img :src="`/static/${feature.name}.png`" class="map-feature-image" :style="`width: ${feature.width}px; height: ${feature.height}px;`" :id="feature.name"/>
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
    components: {
        
    },
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
            socketCreateUserNPCInteractionAnswerCompletion: null,

            // parsed backend for frontend purposes (also reactive because shallow)
            mapName: null,
            playerTop: 0,
            playerLeft: 0,
            facing: 0,
            mapWidth: 0,
            mapHeight: 0,
            
            activatedNPCHTML: '',
            activatedNPCButtonVisible: false,
            activatedInteraction: null,
            activatedInteractionInProgress: false,

            // todo, needs to be shallower
            players: null,
            npcs: null,
            activatedNPCs: [],
            mapFeatures: [],

            // frontend
            mapStyle: 'width: 0px; height: 0px;',
            playerStyle: 'top: 0px; left: 0px;',
            snowheadStyle: 'transform: rotate(0deg);',
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
            if (event.keyCode === 38 || event.keyCode === 87) { 
                this.handleUpPressed();
            } else if (event.keyCode === 37 || event.keyCode === 65) {
                this.handleLeftPressed();
            } else if (event.keyCode === 39 || event.keyCode === 68) {
                this.handleRightPressed();
            } else if (event.keyCode === 40 || event.keyCode === 83) {
                this.handleDownPressed();
            }
        });

        window.addEventListener('keyup', event => {
            if (event.keyCode === 38 || event.keyCode === 87) { 
                this.handleUpUnpressed();
            } else if (event.keyCode === 37 || event.keyCode === 65) {
                this.handleLeftUnpressed();
            } else if (event.keyCode === 39 || event.keyCode === 68) {
                this.handleRightUnpressed();
            } else if (event.keyCode === 40 || event.keyCode === 83) {
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

        socketCallbacks[events.getMapNPCInteractionsSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks getMapNPCInteractionsSuccess");
            this.socketGetMapNPCInteractionsSuccess(data);
        };

        socketCallbacks[events.createUserNPCInteractionAnswerSuccess] = (data) => {
            console.log("[Overworld.vue] socketCallbacks createUserNPCInteractionAnswerSuccess");
            this.socketCreateUserNPCInteractionAnswerSuccess(data);
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

        generateSnowheadStyle() {
            let styles = `transform: rotate(${this.facing}deg)`;
            return styles;
        },
        
        generatePlayerStyle() {
            let styles = `top: ${this.playerTop}px; left: ${this.playerLeft}px;`;

            let npcShouldBeOnTop = false;

            if (this.npcs && this.npcs.length > 0) {
                for (let npc of this.npcs) {
                    const mapLeftInt = parseInt(npc.mapleft, 10);
                    if (Math.abs(this.playerLeft - mapLeftInt) > 50) {
                        continue;
                    }

                    const mapTopInt = parseInt(npc.maptop, 10);
                    const npcElement = document.getElementById(npc.name);
                    if (!npcElement) {
                        continue;
                    }

                    const heightOfNPC = npcElement.clientHeight;
                    const topOffset = (mapTopInt + heightOfNPC) - 50;

                    if (this.playerTop > topOffset) {
                        // styles = `${styles} z-index: 100;`;
                    } else {
                        npcShouldBeOnTop = true;
                    }
                }
            }

            let featureShouldBeOnTop = false;

            if (this.mapFeatures && this.mapFeatures.length > 0) {
                for (let feature of this.mapFeatures) {
                    // const featureElement = document.getElementById(feature.name);
                    // if (!featureElement) {
                    //     continue;
                    // }

                    const featureLeft = parseInt(feature.mapleft, 10) + (parseInt(feature.width, 10) / 2);
                    if (Math.abs(this.playerLeft - featureLeft) > parseInt(feature.width, 10) / 2) {
                        continue;
                    }

                    const mapTopInt = parseInt(feature.maptop, 10) + parseInt(feature.height, 10);
                    if (Math.abs(this.playerTop - mapTopInt) > 100) {
                        featureShouldBeOnTop = true;
                    } else {
                        featureShouldBeOnTop = false;
                    }
                }
            }

            if (!featureShouldBeOnTop && !npcShouldBeOnTop) {
                styles = `${styles} z-index: 100;`;
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

            const activated = this.activatedNPCs[0]; // only 1 at a time for now

            // okay, first determine what the NPC wants to trigger by default
            // and if the current user has already triggered that
            const interactions = activated.interactions;
            if (!interactions || interactions.length < 1) {
                this.activatedNPCs = [];
                return; // no interactions for this npc (FYI they should probably just be a map feature)
            }
            
            const interactionsUserAnswered = interactions.filter(interaction => {
                const answers = interaction.answers;
                if (!answers || answers.length < 1) {
                    return false; // no answers for this interaction (FYI this will probably get the user stuck)
                }

                const userAnswersExist = answers.find(answer => {
                    return answer.userAnswers && answer.userAnswers.length > 0;
                });

                if (userAnswersExist) {
                    return true;
                } else {
                    return false;
                }
            });

            let triggeredInteraction = null;

            if (!interactionsUserAnswered || interactionsUserAnswered.length < 1) {
                // ok, user has not answered anything so the triggering interaction is the
                // default one listed on the npc

                const defaultInteraction = interactions.find(interaction => {
                    return interaction.id === activated.npcinteractionid;
                });

                if (!defaultInteraction) {
                    // FYI no default interaction which mean we can't do anything at all now
                    this.activatedNPCs = [];
                    return;
                }

                triggeredInteraction = defaultInteraction;
            }

            else {
                // user has answered something so the next interaction is the one linked
                // by the answered interaction. we can rely on the chronologically sorted list

                const lastUserInteraction = interactionsUserAnswered[interactionsUserAnswered.length-1];

                const answerUserChose = lastUserInteraction.answers.find(answer => {
                    return answer.userAnswers && answer.userAnswers.length > 0;
                });

                const linkedNextInteraction = interactions.find(interaction => {
                    return interaction.id === answerUserChose.nextnpcinteractionid;
                });

                triggeredInteraction = linkedNextInteraction;
            }

            if (!triggeredInteraction) {
                this.activatedNPCs = [];
                return; // no triggeredInteraction, nothing to do
                // a possible situation: we reached end of convo. if we wanna loop the end item, link the end
                // answer to the same interaction that spawned it FYI
            }

            // okay, we know triggeredInteraction is the one that has all the data
            // we need so we can render it and start GOING!
            const previouslyActivatedInteraction = this.activatedInteraction;
            this.activatedInteraction = triggeredInteraction;

            const thisInteractionHasSameSoundAsLastOne = previouslyActivatedInteraction && previouslyActivatedInteraction.sound && previouslyActivatedInteraction.sound === triggeredInteraction.sound; // this interaction has the same sound as the previous one, so keep it going for now

            // step 1: play sound if it exists
            if (triggeredInteraction.sound && !thisInteractionHasSameSoundAsLastOne) {
                this.originalSoundtrackTime = this.soundtrack.currentTime;
                this.soundtrack.pause();
                this.soundtrack.src = '';
                
                const tallboySound = `/static/${triggeredInteraction.sound}.mp3`;
                this.soundtrack = new Audio(tallboySound);
                this.soundtrack.volume = 0.3;
                this.soundtrack.loop = true;
                this.soundtrack.load();

                this.soundtrack.addEventListener("canplaythrough", () => {
                    if (!this.soundtrack.paused) {
                        return;
                    }

                    if (this.soundtrack.duration && this.activatedSoundtrackTimes[triggeredInteraction.id]) {
                        const lastTallBoyTime = this.activatedSoundtrackTimes[triggeredInteraction.id];
                        this.soundtrack.currentTime = lastTallBoyTime < this.soundtrack.duration ? lastTallBoyTime : 0;
                    } else {
                        this.soundtrack.currentTime = 0;
                    }

                    this.soundtrack.play();
                }, false);
            }

            // step 2: show the text 1 character at a time, skipping over HTML element tags
            this.activatedNPCHTML = '';

            const interactionText = triggeredInteraction.text;
                
            this.activatedNPCButtonVisible = false;
            this.activatedInteractionInProgress = true;

            const addOneMoreLetter = (start, end, currentTag, completion) => {
                if (end > interactionText.length) {
                    this.activatedNPCButtonVisible = true;
                    this.activatedInteractionInProgress = false;
                    return;
                }

                if (currentTag) {
                    this.activatedNPCHTML = `<${currentTag}>${interactionText.slice(start, end)}</${currentTag}>`;
                } else {
                    this.activatedNPCHTML = `${interactionText.slice(start, end)}`;
                }
                
                let newEnd = end+1;
                if (newEnd > interactionText.length) {
                    this.activatedNPCButtonVisible = true;
                    this.activatedInteractionInProgress = false;
                    return;
                }
                
                let newCurrentTag = null;
                let newStart = start;

                const nextChar = interactionText.slice(newEnd-1, newEnd);
                if (nextChar === "<") {
                    const tagEndIndex = interactionText.slice(newEnd+1).indexOf(">") + newEnd + 1;
                    newEnd = tagEndIndex + 1;
                }


                // if (nextChar === "<") {
                //     const startTagEndIndex = interactionText.slice(newEnd).findIndex(">") + newEnd + 2;

                //     if (!currentTag) {
                //         const tagText = interactionText.slice(newEnd+1, startTagEndIndex-1);
                //         newCurrentTag = tagText;
                //     } else {
                //         newCurrentTag = null;
                //     }

                //     newStart = startTagEndIndex+1;
                //     newEnd = startTagEndIndex+2;
                // }

                const newTimeout = setTimeout(() => {
                    completion(newStart, newEnd, newCurrentTag, completion);
                }, 50);

                this.timeouts.push(newTimeout);
            }

            addOneMoreLetter(0, 1, null, addOneMoreLetter);
        },

        untriggerActivatedNPCs() {
            if (!this.activatedNPCs || this.activatedNPCs.length < 1) {
                return;
            }
           
            if (this.timeouts) {
                for (let t of this.timeouts) {
                    clearTimeout(t);
                }
            }

            if (this.activatedInteraction && this.activatedInteraction.sound) {
                this.activatedSoundtrackTimes[this.activatedInteraction.id] = this.soundtrack.currentTime;
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
            this.activatedNPCHTML = '';
            this.activatedInteraction = null;
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
            if (this.activatedInteractionInProgress) {
                return; // suppress spacebar if we are in the middle of an interaction
            }

            if (this.socketCreateUserNPCInteractionAnswerCompletion) {
                return; // we are awaiting an answer save so just do something else instead
            }

            if (this.activatedNPCs && this.activatedNPCs.length > 0) {
                const possibleAnswers = this.activatedInteraction.answers;
                if (!possibleAnswers || possibleAnswers.length < 1) {
                    this.untriggerActivatedNPCs();
                    return; // no answers so untrigger is fine
                }

                const spacebarAnswer = possibleAnswers.find(answer => answer.keycode === 32);
                if (!spacebarAnswer) {
                    // no spacebar answer, but a different answer, so ignore completely
                    return;
                }
                
                const saveAnswer = (completion) => {
                    this.socketCreateUserNPCInteractionAnswerCompletion = completion;
                    this.socketCreateUserNPCInteractionAnswer({
                        username: this.username,
                        npcinteractionanswerid: spacebarAnswer.id
                    });
                };

                const nextInteractionId = spacebarAnswer.nextnpcinteractionid;
                if (!nextInteractionId) {
                    if (spacebarAnswer.ignoreuseranswer === 1) {
                        this.untriggerActivatedNPCs();
                    } else {
                        saveAnswer(() => {
                            this.untriggerActivatedNPCs();
                        });
                    }

                    return; // no subsequent interaction so untrigger and move on
                }

                const nextInteraction = this.activatedNPCs[0].interactions.find(interaction => interaction.id === nextInteractionId);
                if (!nextInteraction) {
                    saveAnswer(() => {
                        this.untriggerActivatedNPCs();
                    });
                    return; // we are SUPPOSED to have a subsequent interaction but we can't find it, so untrigger and move on
                    // (we can assume this is because we are working on a new interaction but it isn't in the db yet)
                }

                // ok so we know we need to trigger the next interaction; this trigger code has it's own
                // logic because it needs to run it based on what's in the db already, so altho we just
                // found out what interaction to use, we can throw it out and trigger() will find it again
                saveAnswer(() => {
                    this.triggerActivatedNPCs();
                });
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
            if (this.activatedNPCs && this.activatedNPCs.length > 0) {
                return;
            }

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

            if (this.upPressed || this.rightPressed) {
                this.facing = this.facing + 14;
            } else if (this.downPressed || this.leftPressed) {
                this.facing = this.facing - 14;
            }

            this.playerStyle = this.generatePlayerStyle();
            this.snowheadStyle = this.generateSnowheadStyle();

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
                this.mapFeatures = map.features;

                this.mapWidth = map.width;
                this.mapHeight = map.height;

                this.mapStyle = this.generateMapStyle();

                this.socketGetMapNPCInteractions({
                    username: this.username,
                    mapname: map.mapname
                });
            }

            if (!this.socketPlayerLocation) {
                return;
            }
    
            this.playerTop = parseInt(this.socketPlayerLocation.maptop, 10);
            this.playerLeft = parseInt(this.socketPlayerLocation.mapleft, 10);
            this.mapName = this.socketPlayerLocation.mapname;
            this.facing = parseInt(this.socketPlayerLocation.facing, 10);

            this.playerStyle = this.generatePlayerStyle();
            this.snowheadStyle = this.generateSnowheadStyle();
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

        socketGetMapNPCInteractionsSuccess(data) {
            const { username, mapname, npcs } = data;

            if (this.username !== username) {
                return;
            }
            
            if (this.mapName !== mapname) {
                return; // ignore map that isn't the same as ours
            }

            this.npcs = npcs;
        },

        socketCreateUserNPCInteractionAnswerSuccess(data) {
            const { username, npc } = data;

            if (username !== this.username) {
                return;
            }

            if (!this.npcs) {
                return;
            }

            const updated = this.npcs.filter(existing => existing.id !== npc.id).concat([npc]);
            this.npcs = updated;

            if (this.activatedNPCs && this.activatedNPCs.length > 0) {
                const matched = this.activatedNPCs.find(activated => activated.id == npc.id);
                if (matched) {
                    this.activatedNPCs = [npc]; // TODO remove activatedNPCs make it activatedNPC
                }
            }

            if (this.socketCreateUserNPCInteractionAnswerCompletion) {
                this.socketCreateUserNPCInteractionAnswerCompletion();
                this.socketCreateUserNPCInteractionAnswerCompletion = null;
                return;
            }
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

        socketGetMapNPCInteractions({ username, mapname }) {
            socketNetworker.emit(events.getMapNPCInteractions, {
                username, mapname
            });
        },

        socketCreateUserNPCInteractionAnswer({ username, npcinteractionanswerid }) {
            socketNetworker.emit(events.createUserNPCInteractionAnswer, {
                username, npcinteractionanswerid
            });

            // TODO remove tomorrow; simulates success event before its ever fired
            let npcWithUpdates = this.activatedNPCs[0];

            let interactions = npcWithUpdates.interactions;
            let interactionWithAnswerIndex = interactions.findIndex(interaction => {
                const answers = interaction.answers;
                const matched = answers.find(answer => answer.id === npcinteractionanswerid);
                if (matched) {
                    return true;
                } else {
                    return false;
                }
            });

            let interactionWithAnswer = interactions[interactionWithAnswerIndex];
            interactionWithAnswer.answers = interactionWithAnswer.answers.map(answer => {
                if (answer.id === npcinteractionanswerid) {
                    let existing = answer.userAnswers;
                    const newAnswer = {
                        username, npcinteractionanswerid
                    };

                    if (existing) {
                        existing.push(newAnswer);
                        answer.userAnswers = existing;
                    } else {
                        answer.userAnswers = [newAnswer];
                    }
                }

                return answer;
            });

            npcWithUpdates.interactions = interactions;

            this.socketCreateUserNPCInteractionAnswerSuccess({
                username, npc: npcWithUpdates
            });
        }

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
    position: relative;
    width: 100%;
    height: 100%;
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

    transition: all 0.5s ease-out;
}

.snowhead {
    width: 50px;
    height: 50px;

    object-fit: contain;
    transition: all 0.5s ease-out;
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

.map-feature {
    z-index: 1;
    pointer-events: none;
    position: fixed;

    font-size: 0px;

    transition: 0.5s ease-out;
}

.map-feature-image {
    object-fit: contain;
}

</style>