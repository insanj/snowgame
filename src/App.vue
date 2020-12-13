<template>
  <div id="app">
    <Home 
        :networker="networker"
    />
  </div>
</template>

<script>

import Home from './pages/Home.vue'
import Networker from './backend/Networker.js';

const networker = new Networker();

export default {
  name: 'App',
  data() {
      return {
          networker
      }
  },
  components: {
    Home
  }
}

</script>

<style>

@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');


#app {
  font-family: Montserrat, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

</style>
