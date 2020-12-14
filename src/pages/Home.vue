<template>
    <div class="home">
        
        <div v-if="state === 0 || state === 1">
            <center>
                <img src="@/assets/trees_mock.png" class="mock-two" />
            </center>

            <center>
                <img src="@/assets/trees_mock.png" class="mock-one" />
            </center>

            <div class="home-card">
                <h1>Snowgame</h1>
                <p>a game as delightful as snow</p>

                <button :disabled="state === 1" v-on:click="landingPlayClicked">
                    {{ state === 1 ? 'loading...' : 'play' }}
                </button>

                <footer>(c) 2020 Snowcode, LLC</footer>
            </div>


        </div>

        <div v-if="state === 3">
            <Overworld 
                :networker="networker"
                :username="username"
                :token="token"
                :initialMapName="initialMapName"
            />
        </div>

    </div>
</template>

<script>
import Overworld from './Overworld.vue';

// const stateOptions = {
//     0: 'landing',
//     1: 'landing-loading',
//     2: 'overworld'
// };

export default {
    name: 'Home',
    props: ['networker'],
    components: {
        Overworld
    },
    data() {
        return {
            state: 0,
            username: window.$cookies.get('snowgame-username'),
            token: null,
            initialMapName: 'start'
        }
    },
    methods: {
        /* ux */
        landingPlayClicked: function () {
            this.state = 1;

            if (window.$cookies.get('snowgame-token') && window.$cookies.get('snowgame-token').length > 0) {
                const token = window.$cookies.get('snowgame-token');

                this.backendAuthenticate({
                    token
                }).then(() => {
                    this.state = 3;
                }).catch(() => {
                    window.$cookies.remove('snowgame-token');
                    this.landingPlayClicked();
                });

                return;
            }

            const username = prompt("username");
            const password = prompt("password");

            this.backendLogin({
                username, password
            }).then(() => {
                this.state = 3;
            }).catch(e => {
                console.log(e);

                this.backendRegister({
                    username, password
                }).then(() => {
                    alert("Welcome to the game!")
                    this.state = 3;
                }).catch(e2 => {
                    alert("Sorry, we couldn't log you in.");
                    console.log(e2);
                    this.state = 0;
                });
            });
        },

        /* networking */
        backendRegister: async function({ username, password }) {
            const response = await this.networker.register({
                username, password
            });

            if (!response || !response.data || !response.data.data) {
                throw new Error('Unexpected response from server');
            }

            const responseData = response.data.data;

            window.$cookies.set('snowgame-username', responseData.username);
            window.$cookies.set('snowgame-token', responseData.token);

            this.username = responseData.username;
            this.token = responseData.token;
            this.state = 3;
        },

        backendLogin: async function({ username, password }) {
            const response = await this.networker.login({
                username, password
            });

            if (!response || !response.data || !response.data.data) {
                throw new Error('Unexpected response from server');
            }

            const responseData = response.data.data;

            window.$cookies.set('snowgame-username', responseData.username);
            window.$cookies.set('snowgame-token', responseData.token);

            this.username = responseData.username;
            this.token = responseData.token;
            this.state = 3;
        },

        backendAuthenticate: async function({ token }) {
            const response = await this.networker.authenticate({
                token
            });

            if (!response || !response.data || !response.data.data) {
                throw new Error('Unexpected response from server');
            }

            const responseData = response.data.data;

            window.$cookies.set('snowgame-username', responseData.username);
            window.$cookies.set('snowgame-token', responseData.token);

            this.username = responseData.username;
            this.token = responseData.token;
            this.state = 3;
        },
    }
}

</script>

<style scoped>

.home {
    position: relative;
    min-width: 1000px;
}

.home-card {
    overflow: hidden;
    position: relative;
    z-index: 1;
    margin-top: 0px;
    padding: 10px;
    height: 500px;
    margin-top: -500px;

    margin-left: auto;
    margin-right: auto;

    text-align: center;
    line-height: 0.5;

    color: #6493ff;
}

.home-card h1 {
    position: absolute;

    text-align: center;
    width: 100%;

    font-size: 100px;
    font-weight: 400;

    text-shadow: 0px 1px 3px rgba(0,0,0,0.2);
}

.home-card p {
    position: absolute;

    text-align: center;
    width: 100%;

    font-weight: 500;
    font-size: 26px;

    text-shadow: 0px 1px 3px rgba(0,0,0,0.2);

    padding-top: 140px;
}

.home-card button {
    position: absolute;
    
    text-align: center;
    width: 100%;

    display: block;

    margin-left: auto;
    margin-right: auto;

    background: none;
    border: none;

    padding: 20px;
    padding-top: 220px;

    margin-top: 100px;

    font-size: 20px;
    font-weight: 600;

    cursor: pointer;

    transition: transform 0.5s;
}

.home-card button:hover {
    opacity: 0.7;
    color: #6493ff;
}

.mock-one {
    pointer-events: none;
    
    margin-top: -100px;
    margin-left: -200px;

    height: 542px;
    width: 600px;

    object-fit: cover;

    transform: rotate(-20deg);
    background: rgba(250, 255, 255, 1);
    box-shadow: 0px 0px 5px rgba(0,0,0,1);
    border-radius: 1px;
}

.mock-two {
    pointer-events: none;
    z-index: -1;

    margin-top: -300px;
    margin-left: 450px;

    height: 542px;
    width: 600px;

    object-fit: cover;

    transform: rotate(35deg);
    background: rgba(250, 255, 255, 1);
    box-shadow: 0px 0px 5px rgba(0,0,0,1);
    border-radius: 1px;
}

footer {
    position: fixed;

    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;

    color: rgba(0,0,0,0.2);
    font-size: 12px;
    font-weight: 200;
}

</style>