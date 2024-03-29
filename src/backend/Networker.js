
const axios = require('axios');

function Networker(baseURL=process.env.VUE_APP_BACKEND_URL) {
    this.baseURL = baseURL;

    this.register = async function ({ username, password }) {
        const registerURL = `${this.baseURL}/rest/register`
        const response = await axios.post(registerURL, {
            username, password
        });
        return response;
    }
    
    this.login = async function ({ username, password }) {
        const loginURL = `${this.baseURL}/rest/login`
        const response = await axios.post(loginURL, {
            username, password
        });
        return response;
    }

    this.authenticate = async function ({ token }) {
        const authenticateURL = `${this.baseURL}/rest/authenticate`
        const response = await axios.post(authenticateURL, {
            token
        });
        return response;
    }
    
}

module.exports = Networker;