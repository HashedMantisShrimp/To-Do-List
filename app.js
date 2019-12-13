//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const _ = require("lodash");
const user = require(__dirname+"/user.js");

//Get username and password
const password = user.getPass();
const userName = user.getUsr();

let listUrl="";
let port = process.env.PORT;

// Connection URL
const url = 'mongodb+srv://'+userName+':'+password+'@cluster0-llc1a.mongodb.net/';
// Database Name
const dbName = 'todolistDB';
const dbUrl = url+dbName;

//Declaring Item Schema
const itemSchema = mongoose.Schema({
  task: {
    type: String,
    required: true
  }
});
//Declaring Schema model AKA db collection
const Item = mongoose.model("item", itemSchema);

//Declaring default documents for Items collection
const item1 = new Item({
  task: "Write down your task on the input field"
});
const item2 = new Item({
  task: "Click + to add it"
});
const item3 = new Item({
  task: "<--- Check this box to delete its Task"
});
const dItems = [item1, item2, item3]; //array of default items


const customListSchema = mongoose.Schema({
  name: String,
  items: [itemSchema]
});
const List = mongoose.model("list", customListSchema);


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

if(port == null || port==""){
  port= 3000;
}

app.listen(port, function() {
  console.log("Server running on port "+port);
});

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true});




app.get("/", function(req, res) {

  Item.find({}, function(err, itemsFound){

    if(itemsFound.length ===0){
      Item.insertMany(dItems, function(err){
        if(err){
          console.log("There was an error while inserting tasks");
          console.log(err);
        }else{
          console.log("Get Default Route - Successfully Inserted default tasks.");
          res.redirect("/");
        }
      });

    }else{
      console.log("Get Default route - rendering list found");

      res.render("list", {
        listTitle: "Today",
        listItem: itemsFound
      });
    }

    console.log("Response shuda been sent");

    //mongoose.connection.close();
  });
  console.log("end of get function");
});

app.get("/about", function(req, res) {

  res.render("about", {
    listTitle: "The About Page"
  });
});


app.get("/custom-:listName", function(req, res){
  const title = _.startCase(req.params.listName);
  listUrl = _.kebabCase(_.lowerCase(req.params.listName));

  List.findOne({name: title}, function(err, foundList){
      console.log("lists.findOne() on get custom route route was called.");
    if(!err){
      if(foundList){
        //Show existing list
          console.log("Get custom route - A list with that title has been found, rendering page");
        res.render("list",{
          listTitle: title,
          listItem: foundList.items
        });

      }else{
        //Create list if none is found
        console.log("Get custom route - No list found, creating the list");
        let list = new List({
          name: title,
          items: dItems
        });

        list.save();
        res.redirect("/custom-"+listUrl);
      }
    }else{
      console.log("There was an error while finding the custom list");
      console.log(err);
    }

  });

  console.log("Params: %o",req.params);
});





app.post("/", function(req, res){
  const task = req.body.newItem;
  const listName = req.body.button;

  const item = new Item({
    task: task
  });

  if(req.body.button==="Today"){
    item.save();
    res.redirect("/");
  }else{

    List.findOne({name:listName}, function(err, itemFound){
      if(!err){
        // Save new item to custom list
        console.log("Post route - list.findOne() was called without err, pushing tsk into lts.");
        itemFound.items.push(item);
        itemFound.save();
        res.redirect("/custom-"+listUrl);
      }else{
        console.log("Error finding list in app.post(/)");
        console.log(err);
      }
    });

  }
});

app.post("/delete", function(req, res){
  const taskId = req.body.checkbox;
  const listName = req.body.targetList;

  console.log(taskId);
  if(listName==="Today"){
    Item.deleteOne({_id: taskId}, function(err){
      if(err){
        console.log("There was an error while removing task "+ taskId);
        console.log(err);
      }else{
        console.log("Successfully removed task "+ taskId);
        res.redirect("/");
      }
    });
  }else{
    List.findOneAndUpdate({name:listName}, {$pull: {items:{_id:taskId}}}, function(err, itemFound){
      console.log("Post Delete route - Successfully removed item: %o, now redirecting", taskId);
      res.redirect("/custom-"+listUrl);
    });
  }


});
