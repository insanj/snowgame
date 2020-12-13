


function Networker(baseURL=process.env.VUE_APP_BACKEND_URL) {
    this.baseURL = baseURL;

    this.login = async function () {

        
        alert(this.baseURL);
        return "hello, world!";


    }

}

module.exports = Networker;