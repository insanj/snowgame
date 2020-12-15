<template>
  <div id="app">
    <Home 
        :networker="networker"
    />

    <div id="snow" />
  </div>
</template>

<script>

import Home from './pages/Home.vue'
import Networker from './backend/Networker.js';
import Snow from './libraries/snow.min.js';

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
  },
    mounted() {
        document.addEventListener('DOMContentLoaded', function() {
            new Snow('#snow',{
                number: 500,
                r: 3,
                v: 2
            });
        });
    }
}

</script>

<style>

body {
    overflow: hidden;
}

@import url('./libraries/snow.min.css');

#snow {
    position:fixed;
    top: 0;
    left: 0;

    width: 1000px;
    height: 1000px;
}

@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

#app {
    font-family: Montserrat, Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    cursor: url('/favicon.ico'), auto;

    width: 1000px;
    height: 1000px;

    overflow: hidden;
}


/* 
@media screen and (max-width: 1245px) {
    html {
        transform: scale(1.0);
        transform-origin: 0 0;
    }
}

@media screen and (max-width: 1135px) {
    html {
        transform: scale(0.89);
        transform-origin: 0 0;
    }
} */
/* 
@media screen and (max-width: 1050px) {
    html {
        transform: scale(0.85);
        transform-origin: 0 0;
    }
} */

@media screen and (max-width: 1000px) {
    html {
        transform: scale(0.9);
        transform-origin: 0 0;
    }
}

@media screen and (max-width: 900px) {
    html {
        transform: scale(0.78);
        transform-origin: 0 0;
    }
}

@media screen and (max-width: 776px) {
    html {
        transform: scale(0.72);
        transform-origin: 0 0;
    }
}

@media screen and (max-width: 718px) {
    html {
        transform: scale(0.6);
        transform-origin: 0 0;
    }
}

@media screen and (max-width: 596px) {
    html {
        transform: scale(0.5);
        transform-origin: 0 0;
    }
}

@media screen and (max-width: 490px) {
    html {
        transform: scale(0.4);
        transform-origin: 0 0;
    }
}

</style>
