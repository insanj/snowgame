import Vue from 'vue'
import App from './App.vue'
import VueCookies from 'vue-cookies';

Vue.config.productionTip = false

Vue.use(VueCookies)
Vue.$cookies.config('30d', '', '', true, 'None');

new Vue({
  render: h => h(App),
}).$mount('#app')
