//system settings & modules
const { app, BrowserWindow, ipcMain } = require('electron')
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const databaseLocation = "./pie.db"
const {v4 : uuidv4} = require('uuid')
const bcrypt = require('bcrypt')

//for patching purposes on the database. Mitagation scripts may need to be ran to upgrade to newer achitecture  
const system_version = "1.0"
const system_user = "SYSTEM"

//logging & encrypt
const saltRounds = 10
let currentUserData = null
let win
let newAccWin
let userSearchWord = ''
let supplierSearchWord = ''
let indSearchWord = ''
let stockSearchWord = ''

function createDB(){
    //first run. Create a database.
    console.log("... ")

    let db = new sqlite3.Database(databaseLocation, (err) =>{
        if(err){
            console.log(err.message);
        }else{
            console.log("Created Database...")
        }
    })

    return db
}

function firstTimeDB(db){
    // this will run all of the sql scripts to populate the database
    console.log("Populating Database...")
    // log table
    db.run('CREATE TABLE log(date text, log text, userid text)', (err)=>{
      if(!err){
        log("CREATING DATABASE FROM FRESH && CREATED LOG TABLE")
        // user table
        db.run('CREATE TABLE user(name text UNIQUE, password text, level numeric, ord numeric, edi numeric, rem numeric, deleted numeric DEFAULT 0, id text)')
        
        log("CREATED USER TABLE")
    
        db.run('CREATE TABLE supplier(id text, name text UNIQUE, address text, phone text, email text, deleted numeric DEFAULT 0)')

        log("CREATED supplier TABLE")

        db.run('CREATE TABLE ingredient(id text, name text UNIQUE, deleted numeric DEFAULT 0)')

        log("CREATED ingredient TABLE")

        db.run('CREATE TABLE stock(id text, indid text, supid text, quant numeric, pdate text, bbefore text, barcode text UNIQUE, deleted numeric DEFAULT 0)')

        log("CREATED stock TABLE")

        db.run("CREATE TABLE product(id text, name text UNIQUE, deleted numeric DEFAULT 0)")

        log("CREATED product TABLE")

        db.run("CREATE TABLE recipeitem(indid text, prodid text, quant numeric)")

        log("CREATED recipeitem TABLE")

        // settings db required to store version number.
        
      }else{
        flash(err.message, 3)
      }
    })
    return true
}

function log(message){
  let user;
  if(currentUserData){
    user = currentUserData.id
  }else{
    //system log
    user = system_user
  }
  
  let db = new sqlite3.Database(databaseLocation)

  let q = `INSERT INTO log(date, log, userid) VALUES("${new Date().toISOString()}", "${message}", "${user}")`

  db.run(q, (err)=>{
    if(err){
      console.log(err.message)
    }
  })
}

function checkForUsers(){
  
  let db = new sqlite3.Database(databaseLocation)
  db.get("SELECT * FROM 'user' LIMIT 0,30", (err, row)=>{
    if(err){
      flash(err.message, 3)
    }
    if(row == undefined){
      win.webContents.send("firstTimeRun", true)
    }else{
      win.webContents.send("confirmation", true)
    }
  })
}

function getUserList(){
  //generates real time userlist to populate user table

  //only send data if admin
  if(!currentUserData){
    return
  }
  if(currentUserData.level == 0){
    let db = new sqlite3.Database(databaseLocation)
    let s = (userSearchWord != "" ? ` WHERE name LIKE "%${userSearchWord}%"` : '')
    let q = `SELECT name, level, id, edi, rem, ord, deleted FROM 'user' ${s}  ORDER BY name ASC`
    db.all(q, (err, rows) => {
      if(!err){
        if(rows){
          win.webContents.send("updatedUserList", rows)
        }
      }
    })

  }
}

function createWindow () {
  
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    // transparency and frameless pretty cool, might add later though
    //frame: false,
    //transparent: true,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('index.html')
  
  ipcMain.on("mainWindowLoaded", ()=>{
      console.log("Main Window Loaded.")
      // check if database is ready.
      console.log("Checking For Database.")

      if(!fs.existsSync(databaseLocation)){
        console.log("First Run Detected, Creating database.")
        win.webContents.send("confirmation", false)
        let db = createDB()
        if(firstTimeDB(db)){
            win.webContents.send("firstTimeRun", true)
        }
      }else{
        checkForUsers()
      }

  })
  ipcMain.on("create-user", (evt, result) => {
    createAccount(result)
  })
  ipcMain.on("login", (evt, results) => {
    let userData = logIn(results)
  })
  ipcMain.on("edit-user", (evt, data) =>{
    editUser(data)
  })
  ipcMain.on("change-pw", (evt, data) =>{
    changePw(data)
  })
  ipcMain.on("add-supplier", (evt, data) =>{
    addSuppler(data)
  })
  ipcMain.on("edit-supplier", (evt, data) =>{
    editSupplier(data)
  })
  ipcMain.on("user-search", (evt, data)=>{
    userSearchWord = data
    getUserList();
  })
  ipcMain.on("supplier-search", (evt, data)=>{
    supplierSearchWord = data
    updateSupplierTable()
  })
  ipcMain.on("add-ind", (evt, data)=>{
    addInd(data)
  })
  ipcMain.on("edit-ind", (evt, data)=>{
    editInd(data)
  })
  ipcMain.on("search-ind", (evt, data)=>{
    indSearchWord = data
    updateIndTable()
  })
  ipcMain.on("add-stock", (evt, data)=>{
    addStock(data)
  })
  ipcMain.on("add-product", (evt, data)=>{
    addProduct(data)
  })
  ipcMain.on("edit-product", (evt, data)=>{
    editProduct(data)
  })
  ipcMain.on("get-product-recipe", (evt, data)=>{
    getRecipe(data)
  })
  ipcMain.on("add-recipe-item", (evt, data)=>{
    addRecipeItem(data)
  })
  ipcMain.on("delete-recipe-item", (evt, data)=>{
    deleteRecipeItem(data)
  })
  ipcMain.on("edit-recipe-item", (evt, data)=>{
    editRecipeItem(data)
  })
  ipcMain.on("edit-stock", (evt, data)=>{
    editStock(data)
  })
  ipcMain.on("search-stock", (evt, data)=>{
    stockSearchWord = data
    updateStockTable()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function getRecipe(id){
  let db = new sqlite3.Database(databaseLocation)
  let q = `SELECT i.id, i.name, ri.quant FROM recipeitem ri INNER JOIN ingredient i ON i.id = ri.indid WHERE ri.prodid = "${id}"`

  db.all(q, (err, rows)=>{
    if(!err){
      win.webContents.send("update-recipe", {"id" : id, "items" : rows})
    }
  })
}

function editRecipeItem(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `UPDATE recipeitem SET quant = ${data.value} WHERE indid = "${data.indid}" AND prodid = "${data.prodid}"`

  db.run(q, (err)=>{
    if(!err){
      getRecipe(data.prodid)
    }
  })
}

function deleteRecipeItem(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `DELETE FROM recipeitem WHERE indid = "${data.indid}" AND prodid = "${data.prodid}"`

  db.run(q, (err)=>{
    if(!err){
      getRecipe(data.prodid)
    }
  })
}

function addRecipeItem(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `INSERT INTO recipeitem(indid, prodid, quant) VALUES("${data.indId}", "${data.id}", ${data.indQty})`

  db.run(q, (err)=>{
    if(err){
      console.log(err.message)
    }else{
      getRecipe(data.id)
    }
  })
}

function updateProductTable(){
  let db = new sqlite3.Database(databaseLocation)
  let q = `SELECT * FROM product`

  db.all(q, (err, rows)=>{
    if(!err){
      if(rows){
        win.webContents.send("update-product-table", rows)
      }
    }
  })
}

function addProduct(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `INSERT INTO product(id, name) VALUES ("${uuidv4()}", "${data}")`

  db.run(q, (err)=>{
    if(err){
      if(err.errno === 19){
        flash("Product Name Must Be Unique", 3)
      }
    }else{
      updateProductTable();
    }
  })
}

function editProduct(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `UPDATE product SET ${data.field} = "${data.value}" WHERE id = "${data.id}"`

  db.run(q, (err)=>{
    if(err){
      if(err.errno === 19){
        flash("Product Name Must Be Unique", 3)
        updateProductTable();
      }
    }else{
      updateProductTable();
    }
  })
}

function editStock(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `UPDATE stock SET ${data.field} = ${data.value} WHERE id = "${data.id}"`
  db.run(q, (err)=>{
    if(!err){
      updateStockTable();
    }else{
      console.log(err.message)
    }
  })
}

function addStock(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `INSERT INTO stock(id, indid, supid, quant, pdate, bbefore, barcode) VALUES ("${uuidv4()}", "${data.Item}", "${data.Supplier}", "${data.QTY}", "${Date.now()}", "${Date.parse(data.bestbefore)}", "${data.barcode}")`

  db.run(q, (err) =>{
    if(err){
      if(err.errno == 19){
        flash("Barcode must be unique", 3);
      }else{
        flash(err.message, 3)
      }
    }else{
      updateStockTable();
    }
  })
}

function updateStockTable(){
  let db = new sqlite3.Database(databaseLocation)

  let sr = (stockSearchWord != "" && stockSearchWord != "out of date" ? `WHERE ind.name LIKE "%${stockSearchWord}%" OR su.name LIKE "%${stockSearchWord}%" OR st.barcode LIKE "%${stockSearchWord}%"` : (stockSearchWord == "out of date" ? `WHERE CAST(st.bbefore as integer) < ${Date.now()}` : ""))

  let q = `SELECT st.id, su.name as supname, ind.name as indname, st.quant as qty, st.barcode, st.bbefore, st.deleted  FROM 'stock' st 
          INNER JOIN 'supplier' su ON su.id = st.supid 
          INNER JOIN 'ingredient' ind on ind.id = st.indid ${sr}`
  //quantity will be changed when it is used eventually

  db.all(q, (err, rows) =>{
    if(!err){
      win.webContents.send("update-stock-table", rows)
    }
  })
}

function addInd(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `INSERT INTO ingredient(id, name) VALUES ("${uuidv4()}", "${data.name}")`
  db.run(q, (err) => {
    if(!err){
      updateIndTable();
    }else{
      if(err.errno ===19){
        flash("Unable to add duplicate ingredient name", 3);
        updateIndTable();
      }
    }
  })
}

function editInd(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `UPDATE ingredient SET ${data.field} = "${data.val}" WHERE id = "${data.id}"`

  db.run(q, (err) =>{
    if(!err){
      updateIndTable();
    }else{
      if(err.errno ===19){
        flash("Unable to add duplicate ingredient name", 3);
      }
      updateIndTable();
    }
  })
}

function updateIndTable(){
  let db = new sqlite3.Database(databaseLocation)
  let s = (indSearchWord != "" ? ` WHERE name LIKE "%${indSearchWord}%"` : '')
  let q = `SELECT * FROM ingredient ${s} ORDER BY name ASC`

  db.all(q, (err, rows) =>{
    if(!err){
      win.webContents.send("updateIndTable", rows)
    }
  })
}

function editSupplier(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `UPDATE supplier SET ${data.field} = "${data.value}" WHERE id = "${data.id}"`

  db.run(q, (err)=>{
    if(!err){
      updateSupplierTable()
    }
  })
}

function addSuppler(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `INSERT INTO supplier(id, name, address, phone, email) VALUES ("${uuidv4()}", "${data.name}", "${data.address}", "${data.phone}", "${data.email}")`

  db.run(q, (err) => {
    if(err){
      flash(err.message, 3)
    }else{
      updateSupplierTable()
    }
  })
}

function updateSupplierTable(){
  let db = new sqlite3.Database(databaseLocation)
  let s = (supplierSearchWord != "" ? ` WHERE name LIKE "%${supplierSearchWord}%" OR address LIKE "%${supplierSearchWord}%" OR email LIKE "%${supplierSearchWord}%" OR phone LIKE "%${supplierSearchWord}%"` : '')
  let q = `SELECT * FROM supplier ${s} ORDER BY name ASC`

  db.all(q, (err, rows) =>{
    if(!err){
      win.webContents.send("updatedSupplierTable", rows)
    }
  })
}

function flash(message, level){
  win.webContents.send("flash", {"message" : message, "level" : level})
}

function createAccount(data){
  let db = new sqlite3.Database(databaseLocation)

  bcrypt.genSalt(saltRounds, (err, salt) => {
    if(err){
      flash(err.message, 3)
    }
    bcrypt.hash(data.pass, salt, (err, hash) => {
      if(err){
        flash(err.message, 3)
      }else{
        let per = ((data.level==0) ? 1 : 0)
        let q = `INSERT INTO user(name, password, level, id, ord, edi, rem) VALUES("${data.user}", "${hash}", ${data.level}, "${uuidv4()}", 1, ${per}, ${per})`

      db.run(q, (err) => {
        if(err){
          let errMsg = (err.errno === 19 ? "Username is taken, please select another." : err.message)
          flash(errMsg, 3)
        }else{
          flash("Successfully Registered Account", 1)
          log(`USER ACCOUNT ${data.user} CREATED`)
          getUserList()
          win.webContents.send("register")
        }
      })
      }
    })
  })


}

function editUser(data){
  let db = new sqlite3.Database(databaseLocation)
  let q = `UPDATE user SET ${data.permission} = ${data.value} WHERE id = "${data.id}"`

  db.run(q, (err) =>{
    if(err){
      flash(err.message, 3)
    }else{
      getUserList()
    }
  })

}

function changePw(data){
  let db = new sqlite3.Database(databaseLocation)

  let q = `SELECT * from user WHERE id = "${currentUserData.id}"`

  db.get(q, (err, row)=>{
    if(err){
      console.log(err.message)
    }
    if(row){
      bcrypt.compare(data.oldpass, row.password, (err, res)=>{
        if(err){
          console.log(err.message)
        }
        if(res){
          bcrypt.genSalt(saltRounds, (err, salt) => {
            if(err){
              console.log(err.message)
            }else{
              bcrypt.hash(data.pass, salt, (err, hash) =>{
                if(err){
                  console.log(err.message)
                }else{
                  q = `UPDATE user SET password = "${hash}" WHERE id = "${currentUserData.id}"`

                  db.run(q, (err)=>{
                    if(err){
                      flash(err.message, 3)
                    }else{
                      flash("Password changed successfully", 1)
                    }
                  })
                }
              })
            }
          })
        }else{
          flash("Cannot confirm old password", 3)
          return
        }
      })
    }
  })
}

function initData(){
  getUserList()
  updateSupplierTable()
  updateIndTable()
  updateStockTable()
  updateProductTable()
}

function logIn(data){
  
  let db = new sqlite3.Database(databaseLocation)

  let q = `SELECT * FROM user WHERE name = '${data.user}'`

  db.get(q, (err, row)=>{
    if(err){
      console.level(err.message)
    }
    if(!row){
      //no user of that name
        let s = `FAILED LOG IN ATTEMPT - ${data.user}`
        log(s)
      flash("Invalid Login", 3)
    }else{
      if(row.deleted === 1){
        flash("Account has been deactivated, please contact admin.", 2)
        return
      }
      bcrypt.compare(data.pass, row.password, (err, res)=>{
        if(err){
          flash(err.message, 3)
        }
        if(res){
          let result = {"level" : row.level, "id" : row.id, "removePer" : row.rem, "orderPer" : row.ord, "editPer" : row.edi}
          currentUserData = result;
          flash("Successful Log-In", 1)
          let s = `${data.user} HAS LOGGED IN`
          log(s)
          initData()
          win.webContents.send("login-successful", result)
        }else{
          let s = `FAILED LOG IN ATTEMPT - ${data.user}`
          log(s)
          flash("Invalid Login", 3)
        }
      })
    }

  })
}