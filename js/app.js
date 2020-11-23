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
        ipc.on("updatedSupplierTable", (evt, data) =>{
            loadSupplierTable(data);
        })
        ipc.on("updateIndTable", (evt, data) =>{
            loadIndTable(data);
        })
        ipc.on("update-stock-table", (evt, data)=>{
            loadStockTable(data);
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
    let r = getFromForm(form)
    let res = r.results
    let f = r.form
    //data validation (passwords match, fields populated)
    if(res.pass === res.passval && res.pass != "" && res.user != ""){
        ipc.send("create-user", res)
        f.reset()
    }else{
        flashCard("Passwords do not match!", 2)
    }
}

function getFromForm(form){
    let f = document.getElementById(form)
    let r = f.elements;
    let res = {};
    for (let x = 0; x < r.length; x++) {
        let item = r.item(x);
        res[item.name] = item.value;
    }
    return {"results" : res, "form" : f}
}

function addSupplier(){
    let r = getFromForm("sup")
    ipc.send("add-supplier", r.results)
    r.form.reset()
}

function changePassword(){
    let r = getFromForm("pwchange")
    let res = r.results
    let f = r.form
    if(res.pass === res.passval && res.pass != ""){
        ipc.send("change-pw", res)
        f.reset()
    }else{
        flashCard("Passwords do not match!", 2)
    }

}

function logIn(){
    let r = getFromForm("logInForm")
    let res = r.results
    let confirm = ipc.send("login", res)

}
function flashCard(message, level){
    let fm = document.getElementById("flash-message");
    fm.innerText = message
    fm.style.display = "block"
    fm.style.backgroundColor = alertColors[level-1]
    setTimeout(() => {  fm.style.display = "none" }, 2000);
}

function loadStockTable(data){
    let d = document.getElementById("StockTable");
    let table = "<table>"
    table += "<tr><th>Ingredient</th><th>Supplier</th><th>QTY</th><th>Barcode</th><th>Best Before</th></tr>"
    for (let x = 0; x < data.length; x++) {
        let bbefore = new Date(parseInt(data[x].bbefore))
        table += `<tr><td>${data[x].indname}</td><td>${data[x].supname}</td><td>${data[x].qty}</td><td>${data[x].barcode}</td><td>${bbefore.toLocaleDateString('en-GB')}</td></tr>`
    }
    table += "</table>"
    d.innerHTML = table
}


function loadIndTable(data){
    let d = document.getElementById("IngredientTable")
    let table = "<table>"
    let removeper = ((userData.level === 0 || userData.removePer === 1) ? '' : 'disabled')
    table += "<tr><th>Name</th><th>Deactivate</th></tr>"
    for (let i = 0; i < data.length; i++) {
        
        let delClass = ((data[i].deleted == 1) ? "class=deact" : "")
        let editper = (((userData.level === 0 || userData.editPer === 1) && data[i].deleted === 0) ? 'contenteditable' : '')
        let delBtn = (data[i].deleted === 0 ? `<button class="btn red" onclick='editInd(1, "${data[i].id}")' ${removeper}>Deactivate</button>` : `<button class="btn green" onclick='editInd(0, "${data[i].id}")'  ${removeper}>Reinstate</button>` )
        table += `<tr ${delClass} ><td onfocusout='editInd(this, "${data[i].id}")' ${editper} >${data[i].name}</td><td>${delBtn}</td></tr>`
    }
    table += "</table>"
    d.innerHTML = table

    let IndList = document.getElementById("IndList")

    IndList.innerHTML = '<option value="" disabled selected>Item</option>';

    for (let x = 0; x < data.length; x++) {
        let d = data[x]
        if(d.deleted === 0){
            opt = document.createElement('option');
            opt.value = d.id
            opt.text = d.name
            IndList.add(opt)
        }
    }
}

function editInd(cell, id){
    let val
    let field
    if(cell !== 1 && cell !== 0){
        val = cell.innerHTML
        field = "name"
    }else{
        val = cell
        field = "deleted"
    }
    ipc.send("edit-ind", {"id": id, "field": field, "val" : val})

}

function searchInd(cell){
    ipc.send("search-ind", cell.value)
}

function loadUserTable(rows){
    let d = document.getElementById("userTable")
    let table = "<table><tr><th>Username</th><th>Admin</th><th>Can Order</th><th>Can Edit/Add</th><th>Can Remove</th><th>Deactivate</th></tr>"
    for (let i = 0; i < rows.length; i++) {
        let admin = (rows[i].level === 0)
        let del = ((rows[i].deleted == 1) ? "disabled" : "")
        let delClass = ((rows[i].deleted == 1) ? "class=deact" : "")
        let delbtn = ((rows[i].deleted == 1) ? `<button onclick='editUser(0, "${rows[i].id}", "deleted")' class="btn green">Reinstate</button>` : `<button class="btn red" onclick='editUser(1, "${rows[i].id}", "deleted")' >Deactivate</button>`)
        //TODO have option to give specific rights/access to non admin users
        let btn = (admin ? '' : delbtn)
        let ord = (rows[i].ord ? 'checked' : '')
        let edit = (rows[i].edi ? 'checked' : '')
        let rem = (rows[i].rem ? 'checked' : '')
        table += `<tr ${delClass} ><td>${rows[i].name}</td>`
        table += `<td>${admin}</td><td><input ${del} type="checkbox" onclick='editUser(this, "${rows[i].id}", "ord")' ${ord}></td>`
        table += `<td><input ${del} type="checkbox" onclick='editUser(this, "${rows[i].id}", "edi")' ${edit}></td><td><input ${del} type="checkbox" onclick='editUser(this, "${rows[i].id}", "rem")' ${rem}></td>`
        table += `<td>${btn}</td></tr>`;
    }
    table += "</table>"
    d.innerHTML = table
}

function loadSupplierTable(data){
    let d = document.getElementById("supplierTable");
    let table = `<table>`
    table += `<tr><th>Name</th><th>Address</th><th>Phone</th><th>Email</th><th>Deactivate</th></tr> `
    let removeper = ((userData.level === 0 || userData.removePer === 1) ? '' : 'disabled')
    for (let i = 0; i < data.length; i++) {
        let delClass = ((data[i].deleted == 1) ? "class=deact" : "")
        let editper = (((userData.level === 0 || userData.editPer === 1) && data[i].deleted === 0) ? 'contenteditable' : '')
        let btn = (data[i].deleted === 1 ? `<button onclick='editSupplier("${data[i].id}", 0, "deleted")'class="btn green" ${removeper}>Reinstate</button>` : `<button onclick='editSupplier("${data[i].id}", 1, "deleted")' class="btn red" ${removeper}>Deactivate</button>`)
        table += `<tr ${delClass}><td onfocusout='editSupplierText(this, "${data[i].id}", "name")' ${editper}>${data[i].name}</td><td onfocusout='editSupplierText(this, "${data[i].id}", "address")' ${editper}>${data[i].address}</td><td onfocusout='editSupplierText(this, "${data[i].id}", "phone")' ${editper}>${data[i].phone}</td><td onfocusout='editSupplierText(this, "${data[i].id}", "email")' ${editper}>${data[i].email}</td><td>${btn}</td></tr>`
    }
    table += `</table>`
    d.innerHTML = table

    let supplierTable = document.getElementById("supplierList")

    supplierTable.innerHTML = '<option value="" disabled selected>Supplier</option>';

    for (let x = 0; x < data.length; x++) {
        let d = data[x]
        if(d.deleted === 0){
            opt = document.createElement('option');
            opt.value = d.id
            opt.text = d.name
            supplierTable.add(opt)
        }
    }

}

function addInd(){
    let r = getFromForm("ind")
    let res = r.results
    if(res.name.trim().length === 0){
        flashCard("Ingredient must have name.", 3)
        return
    }else{
        r.form.reset();
        ipc.send("add-ind", res)
    }
}

function stock(id){
    console.log(id)
    let elements = document.querySelectorAll(".bar");
    [].forEach.call(elements, (el) => {
        el.classList.remove("activ")
        el.classList.add("unactiv")
        el.disabled = true
    })
    document.getElementById(id).classList.add("activ")

    elements = document.querySelectorAll("#addstockcontent div");
    [].forEach.call(elements, (el)=>{
        el.style.display = "none"
    })
    document.getElementById(id.replace("add","")).style.display = "block"

}

function addStock(){
    let r = getFromForm("addStockItem")
    let res = r.results

    //valdiation
    if(res.Item === "" || res.Supplier === ""){
        flashCard("Please Select Supplier and Ingredient", 2)
        return
    }

    if(res.bestbefore === ""){
        flashCard("Please Select a Date", 2)
        return
    }

    if(res.barcode === ""){
        flashCard("Please Enter Barcode", 2)
        return
    }

    if(res.QTY === "" || isNaN(res.QTY)){
        flashCard("Please Enter a Valid Quantity", 2)
        return
    }

    ipc.send("add-stock", res)
}

function cancelStock(){
    let elements = document.querySelectorAll(".bar");
    [].forEach.call( elements, (el)=>{
      let e = el.classList
      e.remove("activ")
      e.remove("unactiv")
      el.disabled = false  
    })
    
    elements = document.querySelectorAll("#addstockcontent div");
    [].forEach.call( elements, (el) => {
        el.style.display = "none"
    })
}

function searchUser(input){
    let search = input.value
    ipc.send("user-search", search)
}
function searchSupplier(input){
    let search = input.value
    ipc.send("supplier-search", search)
}
function editSupplierText(cell, id, field){
    ipc.send("edit-supplier", {"id" : id, "field" : field, "value" : cell.innerText})
}

function editSupplier(id, change, field){
    ipc.send("edit-supplier", {"id" : id, "field" : field, "value" : change})
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