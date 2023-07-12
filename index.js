window.onload = function () {
  document
    .getElementsByTagName("dialog")[0]
    .addEventListener("click", () =>
      document.getElementsByTagName("dialog")[0].close()
    );

  const myDiv = document.getElementById("detailMail");
  myDiv.addEventListener("click", (event) => event.stopPropagation());
};

const CLIENT_ID =
  "244471880539-8p0tdhdevu7m56vbaj8k0a1jgcnvlbue.apps.googleusercontent.com";
const API_KEY = "AIzaSyB5V9QlZtT4LYwcjO1l2k3GjY-Ys3MdbkM";

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest";

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES =
  "https://www.googleapis.com/auth/gmail.readonly https://mail.google.com/";

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById("authorize_button").style.visibility = "hidden";
document.getElementById("signout_button").style.visibility = "hidden";
document.getElementById("showdata").style.visibility = "hidden";

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
  gapi.load("client", initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "", // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById("authorize_button").style.visibility = "visible";
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }
    document.getElementById("signout_button").style.visibility = "visible";
    document.getElementById("showdata").style.visibility = "visible";
    document.getElementById("authorize_button").innerText = "Refresh";
    listEmails();
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({ prompt: "" });
  }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken("");
    document.getElementById("content").innerText = "";
    document.getElementById("authorize_button").innerText = "Authorize";
    document.getElementById("signout_button").style.visibility = "hidden";
    document.getElementById("showdata").style.visibility = "hidden";
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

let currentUser = "";
let bodyData = [];
let senderData = [];
let receiverData = [];
let subjectData = [];
async function sendMail() {
  document.getElementById("noti").innerHTML = "";
  var to = document.getElementById("fname").value;
  var subject = document.getElementById("lname").value;
  var body = document.getElementById("mailContent").value;
  if (!to || !subject || !body) {
    document.getElementById("noti").innerHTML =
      "<div style='color: red; padding: 5px;'>Please fill all fields</div>";
    return;
  }

  var message = [
    "Content-Type: " + 'multipart/mixed; boundary="boundaryX"' + "\n",
    "MIME-Version: 1.0\n",
    "To: ",
    to,
    "\n",
    "Subject: " + subject + "\r\n\r\n",
    "--boundaryX" + "\r\n",
    'Content-Type: text/plain; charset="UTF-16;"\n',
    "Content-Transfer-Encoding: 8bit\n",
    body,
  ].join("");

  if (document.getElementById("file").files.length > 0) {
    var files = document.getElementById("file").files;
    const filePromises = Array.from(files).map((file) =>
      readFileAsDataURL(file)
    );
    const dataURLs = await Promise.all(filePromises);
    for (var i = 0; i < dataURLs.length; i++) {
      var data = dataURLs[i].split(",")[1];
      message +=
        '\n\n--boundaryX\nContent-Type: application/octet-stream\nContent-Disposition: attachment; filename="' +
        files[i].name +
        '"\nContent-Transfer-Encoding: base64\n\n' +
        data;
    }
  }
  message += "\n--boundaryX--";
  console.log(message);
  var request = gapi.client.gmail.users.messages.send({
    userId: "me",
    resource: {
      raw: window.btoa(message).replace(/\+/g, "-").replace(/\//g, "_"),
    },
  });
  request.execute(
    function (response) {
      console.log(response);
      document.getElementById("noti").innerHTML =
        "<div style='color: green; padding: 5px;'>Mail sent successfully</div>";
      document.getElementById("content").clear;

      var sender = "You";
      var datetime = new Date();
      var x = body;
      const htmlTest = document.createElement("tr");
      htmlTest.innerHTML = `
    <td>${sender}</td>
    <td>${to == currentUser ? "You" : to}</td>
    <td style="color: blue; cursor: pointer;" onclick="show(${0})"><u>${subject}</u></td>
    <td>${datetime}</td>
    `;
      var emailList = document.getElementById("tableMail");
      var secondChildTag = emailList.children[1];
      emailList.insertBefore(htmlTest, secondChildTag);

      senderData.unshift(sender);
      receiverData.unshift(to == currentUser ? "You" : to);
      subjectData.unshift(subject);
      bodyData.unshift(body);
    },
    function (error) {
      document.getElementById("noti").innerHTML =
        "<div style='color: red; padding: 5px;'>Mail sent failed</div>";
    }
  );
}

function listEmails() {
  bodyData = [];
  senderData = [];
  receiverData = [];
  subjectData = [];
  gapi.client.gmail.users.getProfile({ userId: "me" }).then((d) => {
    // Get current user
    currentUser = JSON.parse(d.body).emailAddress;

    document.getElementById("cu").textContent = "User: " + currentUser;
    const parentTag = document.querySelector("#tableMail");
    parentTag.innerHTML = "";

    var request = gapi.client.gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
      orderBy: "newest",
    });

    request.execute(function (response) {
      var messages = response.messages;
      console.log(messages);
      var emailList = document.getElementById("tableMail");

      const newElement = document.createElement("thead");
      newElement.innerHTML = `<tr>
      <th>Sent From</th>
      <th>Sent To</th>
      <th>Subject</th>
      <th>Datetime</th>
    </tr>`;
      emailList.appendChild(newElement);

      for (var i = 0; i < messages.length; i++) {
        var messageRequest = gapi.client.gmail.users.messages.get({
          userId: "me",
          id: messages[i].id,
        });
        var xy = 0;
        messageRequest.execute(function (message) {
          var emailItem = document.createElement("tr");

          var sender = message.payload.headers.find(
            (header) => header.name === "From"
          )?.value;
          var receiver = message.payload.headers.find(
            (header) => header.name === "To"
          )?.value;
          if (sender == currentUser) {
            sender = "You";
          }
          var subject = message.payload.headers.find(
            (header) => header.name === "Subject"
          )?.value;
          var datetime = message.payload.headers.find(
            (header) => header.name === "Date"
          )?.value;
          var x = message?.payload?.parts?.[0]?.body?.data
            ? message?.payload?.parts?.[0]?.body?.data
            : message?.payload?.body?.data
            ? message?.payload?.body?.data
            : "";

          var body;
          try {
            body = atob(x);
            emailItem.innerHTML = `
            <td>${sender}</td>
            <td>${receiver}</td>
            <td style="color: blue; cursor: pointer;" onclick="show(${xy})"><u>${subject}</u></td>
            <td>${datetime}</td>
            `;
            let index = body.indexOf("--boundary");
            if (index !== -1) {
              body = body.substring(0, index);
            }
            emailList.appendChild(emailItem);
            senderData[xy] = sender;
            subjectData[xy] = subject;
            bodyData[xy++] = body;
          } catch (err) {
            bodyData[xy++] = "";
          }
        });
      }
    });
  });
}
function show(index) {
  document.getElementById("detailMail").innerHTML = `
  <div>Sender: ${senderData[index]}</div>
  <div>Receiver: ${receiverData[index]}</div>
  <div>Subject: ${subjectData[index]}</div>
  <div>Content: ${bodyData[index]}</div>
`;
  const dialog = document.getElementsByTagName("dialog")[0];
  dialog.showModal();
}
