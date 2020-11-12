const electron = require("electron");
const ipc = electron.ipcRenderer;
const alertColors = ["limegreen", "orange", "red"]
var userData = null;

//flow control
document.addEventListener("DOMContentLoaded", ()=>{
    ipc.send("mainWindowLoaded")
    ipc.on("confirmation", (evt, result) => {
        if(result){
            document.getElementById("loading-window").style.display = "none"
            document.getElementById("login-box").style.display = "block"
        }else{
            document.getElementById("loading-window").innerText = "First Run Detected, Populating Database..."
        }
    })
    ipc.on("firstTimeRun", () => {
        document.getElementById("loading-window").style.display = "none"
        document.getElementById("firstTimeWindow").style.display = "block"
    })
    ipc.on("flash", (evt, result) => flashCard(result.message, result.level))
    ipc.on("login-successful",  (evt, result) => {
        userData = result;
        if(userData.level != 0){
            document.getElementById("adminPBtn").style.display = "none"
        }
        document.getElementById("login-box").style.display = "none"
        document.getElementById("main-content").style.display = "block"
    })
    ipc.on("register", () => {
        document.getElementById("login-box").style.display = "block"
        document.getElementById("firstTimeWindow").style.display = "none"
    })
})

function content(c){
    let divs = document.getElementsByClassName("content");
    for (let i = 0; i < divs.length; i++) {
        divs[i].style.display = "none"            
    }
    document.getElementById(c+'d').style.display = "block"

}
function newAccount(){
    let r = document.getElementById("reg").elements;
    let res = {};
    for (let x = 0; x < r.length; x++) {
        let item = r.item(x);
        res[item.name] = item.value;
    }
    //data validation (passwords match, fields populated)
    if(res.pass === res.passval && res.pass != "" && res.user != ""){
        ipc.send("create-user", res)
    }else{
        flashCard("Passwords do not match!", 3)
    }
}
function logIn(){
    let r = document.getElementById("logInForm").elements;
    let res = {};
    for (let x = 0; x < r.length; x++) {
        let item = r.item(x);
        res[item.name] = item.value;
    }
    let confirm = ipc.send("login", res)

}
function flashCard(message, level){
    let fm = document.getElementById("flash-message");
    fm.innerText = message
    fm.style.display = "block"
    fm.style.backgroundColor = alertColors[level-1]
    setTimeout(() => {  fm.style.display = "none" }, 2000);
}