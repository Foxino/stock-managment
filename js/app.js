const electron = require("electron");
const ipc = electron.ipcRenderer;
const alertColors = ["limegreen", "orange", "red"]
var userData = null;

//flow control

if(true){
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
        ipc.on("updatedUserList", (evt, result) =>{
            loadUserTable(result);
        })
    })
}

function content(c){
    let divs = document.getElementsByClassName("content");
    for (let i = 0; i < divs.length; i++) {
        divs[i].style.display = "none"            
    }
    document.getElementById(c+'d').style.display = "block"

}
function newAccount(form){
    let f = document.getElementById(form);
    let r = f.elements;
    let res = {};
    for (let x = 0; x < r.length; x++) {
        let item = r.item(x);
        res[item.name] = item.value;
    }
    //data validation (passwords match, fields populated)
    if(res.pass === res.passval && res.pass != "" && res.user != ""){
        ipc.send("create-user", res)
        f.reset()
    }else{
        flashCard("Passwords do not match!", 2)
    }
}

function changePassword(){
    let f = document.getElementById("pwchange")
    let r = f.elements;
    let res = {};
    for (let x = 0; x < r.length; x++) {
        let item = r.item(x);
        res[item.name] = item.value;
    }
    if(res.pass === res.passval && res.pass != ""){
        ipc.send("change-pw", res)
        f.reset()
    }else{
        flashCard("Passwords do not match!", 2)
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

function loadUserTable(rows){
    let d = document.getElementById("userTable")
    let table = "<table><tr><th>Username</th><th>Admin</th><th>Can Order</th><th>Can Edit/Add</th><th>Can Remove</th></tr>"
    for (let i = 0; i < rows.length; i++) {
        let admin = (rows[i].level === 0)
        let del = ((rows[i].deleted == 1) ? "disabled" : "")
        let delbtn = ((rows[i].deleted == 1) ? `<button onclick='editUser(0, "${rows[i].id}", "deleted")' style="background: limegreen;">✔️</button>` : `<button onclick='editUser(1, "${rows[i].id}", "deleted")' style="background: red;">❌</button>`)
        //TODO have option to give specific rights/access to non admin users
        let btn = (admin ? '' : delbtn)
        let ord = (rows[i].ord ? 'checked' : '')
        let edit = (rows[i].edi ? 'checked' : '')
        let rem = (rows[i].rem ? 'checked' : '')
        table += `<tr><td>${rows[i].name}</td>`
        table += `<td>${admin}</td><td><input ${del} type="checkbox" onclick='editUser(this, "${rows[i].id}", "ord")' ${ord}></td>`
        table += `<td><input ${del} type="checkbox" onclick='editUser(this, "${rows[i].id}", "edi")' ${edit}></td><td><input ${del} type="checkbox" onclick='editUser(this, "${rows[i].id}", "rem")' ${rem}></td>`
        table += `<td>${btn}</td></tr>`;
    }
    table += "</table>"
    d.innerHTML = table
}

function editUser(checkbox, id, permission){
    let value
    if(checkbox === 1 | checkbox === 0){
        value = checkbox
    }else{
        value = checkbox.checked
    }
    ipc.send("edit-user", {"id" : id, "permission" : permission, "value" : value})
}