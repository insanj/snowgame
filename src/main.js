import Vue from 'vue'
import App from './App.vue'
import VueCookies from 'vue-cookies';

import dotenv from 'dotenv';
dotenv.config()

if (process.env.VUE_APP_FORCE_HTTPS === "1" && window.location.protocol !== 'https:') {
    const locationWithoutHTTP = window.location.href.substring(window.location.protocol.length);
    window.location = `https:${locationWithoutHTTP}`;
}

else {
    Vue.config.productionTip = false

    Vue.use(VueCookies);
    
    new Vue({
      render: h => h(App),
    }).$mount('#app')
}
