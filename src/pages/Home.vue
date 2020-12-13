<template>
    <div class="home">

        <div v-if="state === 0 || state === 1" class="home-card">
            <h1>Snowgame</h1>
            a game as delightful as snow

            <button :disabled="state === 1" v-on:click.prevent="landingPlayClicked">
                {{ state === 1 ? 'loading...' : 'play' }}
            </button>
        </div>

    </div>
</template>

<script>

// const stateOptions = {
//     0: 'landing',
//     1: 'landing-loading',
//     2: 'overworld'
// };

export default {
    name: 'Home',
    props: ['networker'],
    data() {
        return {
            state: !this.$cookies.get('snowgame-name') || this.$cookies.get('snowgame-name').length < 1 ? 0 : 3,
            name: this.$cookies.get('snowgame-name')
        }
    },
    methods: {
        /* ux */
        landingPlayClicked: function () {
            this.state = 1;
            this.backendLogin();
        },

        /* networking */
        backendLogin: function() {
            this.networker.login().then((response) => {
                if (!response || !response.data || !response.data.name) {
                    this.state = 1;
                    return;
                }

                this.$cookies.set('snowgame-name', response.data.name);
                this.state = 3;
            }).catch(e => {
                console.log(e);
                this.state = 1;
            });
        }
    }
}

</script>

<style scoped>

.home {
    position: relative;
    min-width: 1000px;
}

.home-card {
    margin-top: 200px;
    padding: 10px;

    margin-left: auto;
    margin-right: auto;

    text-align: center;
    line-height: 0.5;
}

.home-card h1 {
    font-size: 100px;
    font-weight: 100;
}

.home-card button {
    display: block;

    margin-left: auto;
    margin-right: auto;

    background: none;
    border: none;

    padding: 20px;

    margin-top: 100px;

    font-size: 20px;
    font-weight: 600;

    cursor: pointer;


    transition: transform 0.5s;
}

.home-card button:hover {
    opacity: 0.7;
    color: #6493ff;
    transform: scale(1.1, 1.1) rotate(5deg);
    transition: transform 0.5s;
}

</style>