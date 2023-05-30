let socket = io();

let redirectFlag = false

$(() => {
    $("#send").click(() =>{
        let message = { name: $("#name").val(), message: $("#message").val()};
        postMessages(message);
        
    })
    $("#sendhis").click(() => {
        let userna = $("#user").val();
        getHistory(userna)
    })
    getMessages()
})

socket.on("eventmessage", addMessages);

function addMessages(message){
    if (message.name !== undefined){
        if (message.message !== ""){
            $("#messages").prepend(`<h4> ${message.name} </h4> <p> ${message.message}</p>`)
        }
    } else {
        window.location.href = "/index.html"
    }
}

function getMessages(){
    $.get("http://localhost:3000/meddelanden", (data) => {
        data.forEach(addMessages);
        });
}

function postMessages(message){
    $.post("http://localhost:3000/meddelanden", message);
}

function getHistory(username) {
    $.get(`http://localhost:3000/message-history/${username}`, (data) => {
        $("#hismessa").empty();
        data.forEach(addHistory);
    });
}

function addHistory(message){
    $("#hismessa").prepend(`<h4> ${message.name} </h4> <p> ${message.message}</p>`)
}