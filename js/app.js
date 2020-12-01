const electron = require("electron");
const ipc = electron.ipcRenderer;
const alertColors = ["limegreen", "orange", "red"]
var userData = null;
var indTableData = null;

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
            if(!userData){
                document.getElementById("login-box").style.display = "block"
                document.getElementById("firstTimeWindow").style.display = "none"
            }
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
        ipc.on("update-product-table", (evt, data)=>{
            loadProductTable(data);
        })
        ipc.on("update-recipe", (evt, data)=>{
            loadRecipeInfo(data)
        })
        ipc.on("recipe-template", (evt, data)=>{
            loadRecipeTemplate(data)
        })
        ipc.on("successful-barcode", (evt, data)=>{
            document.getElementById("indstocklist").value = data[0].id
            document.getElementById("stockitemqty").value = data[0].quant
            document.getElementById("stockqtymax").innerHTML = " / " + data[0].quant
        })
    })
}

function loadRecipeTemplate(data){
    let r = document.getElementById("recipeTemplate")

    let t = `<label for="bestbefore">Best Before</label> <input name="bestbefore" type="date" required /> <input id="barcode" name="QTY" placeholder="Barcode" type="text" required />`

    t += `<h3>Ingredients</h3>`

    t += `<label for="bestbefore">Barcode Search</label> <input name="text" type="text" oninput='checkForStock(this)'/> `
    t += `<select id="indstocklist" placeholder="Item" name="Item"><option value="" disabled selected>Ingredient</option>`
    
    for (let x = 0; x < data.stockList.length; x++) {
        let d = data.stockList[x]
        let s = d.name + " (" + d.barcode + ", " + d.quant + ")"
        t += `<option value="${d.id}">${s}</option>`
        
    }

    t += `</select> <input id="stockitemqty" style="width: 50px;" name="QTY" placeholder="Quantity" type="text" required /> <span id="stockqtymax"> / NA </span> <button class="btn green"  >Add</button> `

    r.innerHTML = t
}

function checkForStock(cell){
    cell.value != "" ? ipc.send("check-stock-barcode", cell.value) : 0
}

function loadRecipeInfo(data){
    let r = document.getElementById("productRecipe")
    
    let removeper = ((userData.level === 0 || userData.removePer === 1) ? '' : 'disabled')
    let editper = ((userData.level === 0 || userData.editPer === 1) ? 'contenteditable' : '')

    let idn = data.id + "recipe"

    let d = `<select id="${idn}" placeholder="Item" name="Item"><option value="" disabled selected>Ingredient</option></select>`
    d += `  <input id="recipeitemqty" style="width: 50px;" name="QTY" placeholder="Quantity" type="text" required />`
    d += `<button class="btn green" onclick='addRecipeItem("${data.id}"); return false;' > Add </button>`

    d += `<br><br> <table> <tr><th>Ingredient</th><th>Qty</th><th>Delete</th></tr>`

    let itemsInUse = []

    for (let x = 0; x < data.items.length; x++) {
        itemsInUse.push(data.items[x].id)
        d += `<tr><td>${data.items[x].name}</td><td ${editper} onfocusout='editRecipeItem("${data.id}", "${data.items[x].id}", this.innerHTML)' >${data.items[x].quant}</td><td><button onclick='deleteRecipeItem("${data.id}", "${data.items[x].id}")' class="btn red" ${removeper} >Delete</button></td></tr>`
    }

    d += `</table>`

    r.innerHTML = d
    
    if(indTableData){

        let IndList = document.getElementById(idn)

        IndList.innerHTML = '<option value="" disabled selected>Ingredient</option>';

        for (let x = 0; x < indTableData.length; x++) {
            let d = indTableData[x]
            if(d.deleted === 0){
                opt = document.createElement('option');
                opt.value = d.id
                opt.text = d.name
                opt.disabled = itemsInUse.includes(d.id)
                IndList.add(opt)
            }
        }
    }


}

function editRecipeItem(id, indId, value){
    if(value !== "" && !isNaN(value)){
        ipc.send("edit-recipe-item", {"prodid" : id, "indid" : indId, "value" : value})
    }
}

function deleteRecipeItem(id, indId){
    ipc.send("delete-recipe-item", {"prodid" : id, "indid" : indId})
}

function addRecipeItem(id){
    let indId = document.getElementById(id+"recipe").value
    let indQty = document.getElementById("recipeitemqty").value

    if(indId !== "" && indQty !== ""){
        ipc.send("add-recipe-item", {"id" : id, "indId" : indId, "indQty" : indQty})
    }else{
        flashCard("Incomplete Form", 2)
    }

}


function addProd(){
    let r = getFromForm("prod")
    let res = r.results
    let f = r.form
    if(res.name !== ""){
        ipc.send("add-product", res.name)
        f.reset()
    }else{
        return
    }
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
        if(res.user === ""){
            flashCard("Please Enter a Valid Username", 2)
        }else{
            flashCard("Passwords do not match!", 2)
        }
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

function loadProductRecipeTemplate(cell){
    let activeProduct = cell.value
    if(activeProduct !== ""){
        ipc.send("get-product-recipe-template", activeProduct)
    }
}

function loadProductTable(data){
    let d = document.getElementById("ProdTable");
    let table = "<table>"

    let removeper = ((userData.level === 0 || userData.removePer === 1) ? '' : 'disabled')

    table += "<tr><th>Name</th><th>Deactivate</th></tr>"
    for (let x = 0; x < data.length; x++) {
        
        let delClass = ((data[x].deleted == 1) ? "class=deact" : "")
        let editper = (((userData.level === 0 || userData.editPer === 1) && data[x].deleted === 0) ? 'contenteditable' : '')
        let delBtn = (data[x].deleted === 0 ? `<button class="btn red" onclick='editProd("${data[x].id}", "deleted", 1)' ${removeper}>Deactivate</button>` : `<button class="btn green" onclick='editProd("${data[x].id}", "deleted", 0)'  ${removeper}>Reinstate</button>`)
        table += `<tr ${delClass}><td  ${editper} onfocusout='editProd("${data[x].id}", "name", this.innerHTML)' >${data[x].name}</td><td>${delBtn}</td></tr>`
    }
    table += "</table>"
    d.innerHTML = table

    let ProdList = document.getElementById("ProdList")
    let ProdList2 = document.getElementById("ProdList2")
    
    ProdList2.innerHTML = '<option value="" disabled selected>Product</option>';
    ProdList.innerHTML = '<option value="" disabled selected>Product</option>';

    for (let x = 0; x < data.length; x++) {
        let d = data[x]
        if(d.deleted === 0){
            opt = document.createElement('option');
            opt.value = d.id
            opt.text = d.name
            ProdList.add(opt)
        }
    }
    for (let x = 0; x < data.length; x++) {
        let d = data[x]
        if(d.deleted === 0){
            opt = document.createElement('option');
            opt.value = d.id
            opt.text = d.name
            ProdList2.add(opt)
        }
    }
}

function loadProdRecipe(cell){
    let activeProduct = cell.value
    if(activeProduct !== ""){
        ipc.send("get-product-recipe", activeProduct)
    }
}

function editProd(id, field, value){
    ipc.send("edit-product", {"id" : id, "field": field, "value": value})
}

function loadStockTable(data){
    let d = document.getElementById("StockTable");
    let table = "<table>"
    let removeper = ((userData.level === 0 || userData.removePer === 1) ? '' : 'disabled')
    table += "<tr><th>Ingredient</th><th>Supplier</th><th>QTY</th><th>Barcode</th><th>Best Before</th><th>Delete</th></tr>"
    for (let x = 0; x < data.length; x++) {
        
        let delClass = ((data[x].deleted == 1) ? "class=deact" : "")
        let bbefore = new Date(parseInt(data[x].bbefore))

        let ood = ((bbefore < Date.now()) ? 'style="color: red;"' : '')

        let delBtn = (data[x].deleted === 0 ? `<button class="btn red" onclick='editStock("${data[x].id}", "deleted", 1)' ${removeper}>Delete</button>` : `<button class="btn green" onclick='editStock("${data[x].id}", "deleted", 0)'  ${removeper}>Reinstate</button>` )
        
        table += `<tr ${delClass} ${ood} ><td>${data[x].indname}</td><td>${data[x].supname}</td><td>${data[x].qty}</td><td>${data[x].barcode}</td><td>${bbefore.toLocaleDateString('en-GB')}</td><td>${delBtn}</td></tr>`
    }
    table += "</table>"
    d.innerHTML = table
}

function editStock(id, field, value){
    ipc.send("edit-stock", {"id": id, "field": field, "value": value})
}

function loadIndTable(data){
    indTableData = data
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

function searchStD(cell){
    ipc.send("stock-deleted-show", cell.checked)
}

function searchSt(cell){
    ipc.send("search-stock", cell.value)
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