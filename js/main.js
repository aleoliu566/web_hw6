var config = {
    apiKey: "AIzaSyA8xWPVNy__uonobvIlICleMfBYpP059sE",
    authDomain: "easyauction-dc761.firebaseapp.com",
    databaseURL: "https://easyauction-dc761.firebaseio.com",
    storageBucket: "easyauction-dc761.appspot.com",
};
firebase.initializeApp(config);
ImageDealer.REF = firebase;
var currentUser;

var items = firebase.database().ref("items");
var name;
var user_id;
var user_photo;
var uploadModal = new UploadModal($("#upload-modal"));
var viewModal = new ViewModal($("#view-modal"));

/*
    分為三種使用情形：
    1. 初次登入，改變成登入狀態
    2. 已為登入狀態，reload 網站照樣顯示登入狀態
    3. 未登入狀態
    登入/當初狀態顯示可使用下方 logginOption function
*/

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        logginOption(true);
    } else {
        logginOption(false);
    }
});

function signin(fbProvider) {
    firebase.auth().signInWithPopup(fbProvider).then(function(result) {
        //登入後的頁面行為
        logginOption(true);
        name = result.user.displayName;
        user_id = result.user.uid;
        user_photo = result.user.photoURL;
        console.log(name);
        location.reload();
    }).catch(function(error) {
        var errorCode = error.code;
        var errorMessa = error.message;
        console.log(errorCode, errorMessa);
    })
}

$("#signin").click(function() {
    var fbProvider = new firebase.auth.FacebookAuthProvider();
    signin(fbProvider);
});

$("#signout").click(function() {
    firebase.auth().signOut().then(function() {
        logginOption(false);
        location.reload();
    }, function(error) {
        console.log(error.code);
    });
});
// ----------------------------------------------------------------


function saveItems(title, price, descrip) {
    var itemID = items.push({ "title": title, "price": price, "descrip": descrip, "name": name, "seller": firebase.auth().currentUser.uid, "userTime": new Date($.now()).toLocaleString() });
}


$("#submitData").click(function() {
    // 上傳新商品
    var dataArr = $("#item-info").serializeArray();
    var currentItemKey;
    if (dataArr[0].value != null && dataArr[1].value != null && dataArr[2].value != null) {
        saveItems(dataArr[0].value, parseInt(dataArr[1].value), dataArr[2].value);
    }
    firebase.database().ref("items").once("value", function(data) {
        var data = data.val();
        currentItemKey = Object.keys(data)[Object.keys(data).length - 1];
        uploadModal.itemKey = currentItemKey;
        uploadModal.submitPic(firebase.auth().currentUser.uid);
    });

});

$("#editData").click(function() {
    // 編輯商品資訊
    var dataArr = $("#item-info").serializeArray();
    item = firebase.database().ref("items/" + nowItem);
    item.update({ "title": dataArr[0].value, "price": parseInt(dataArr[1].value), "descrip": dataArr[2].value });
    console.log(nowSeller);
    uploadModal.submitPic(nowSeller + "/" + nowItem);
    // $("#upload-modal").modal('hide');
})

$("#removeData").click(function() {
        var dataArr = $("#item-info").serializeArray();
        item = firebase.database().ref("items/" + nowItem).remove();
        uploadModal.deletePic(nowSeller + "/" + nowItem);
        //刪除商品
    })
    /*
        商品按鈕在dropdown-menu中
        三種商品篩選方式：
        1. 顯示所有商品
        2. 顯示價格高於 NT$10000 的商品
        3. 顯示價格低於 NT$9999 的商品
    */

function logginOption(isLoggin) {
    if (isLoggin) {
        $("#upload").css("display", "block");
        $("#signin").css("display", "none");
        $("#signout").css("display", "block");
    } else {
        $("#upload").css("display", "none");
        $("#signin").css("display", "block");
        $("#signout").css("display", "none");
    }
}
$(".dropdown-menu li:nth-child(2)").click(function(e) {
    firebase.database().ref("items").orderByChild("price").startAt(10000).on("value", reProduceAll);
});

$(".dropdown-menu li:nth-child(3)").click(function(e) {
    firebase.database().ref("items").orderByChild("price").startAt(0).endAt(9999).on("value", reProduceAll);
});

$(".dropdown-menu li:nth-child(1)").click(function(e) {
    firebase.database().ref("items").on("value", reProduceAll);
});
firebase.database().ref("items").on("value", reProduceAll);

function reProduceAll(allItems) {
    /*
    清空頁面上 (#item)內容上的東西。
    讀取爬回來的每一個商品
    */
    /*
      利用for in存取
    */
    var allData = allItems.val();
    // console.log(allData);
    $("#items").empty();
    for (var itemData in allData) {
        produceSingleItem(allData[itemData], itemData);
    }
}
var nowItem;
var nowSeller;
// var messBox = new MessageBox(firebase.auth().currentUser, nowItem);
// 每點開一次就註冊一次
function produceSingleItem(sinItemData, itemKey) {
    /*
      抓取 sinItemData 節點上的資料。
      若你的sinItemData資料欄位中並沒有使用者名稱，請再到user節點存取使用者名稱
      資料齊全後塞進item中，創建 Item 物件，並顯示到頁面上。
    */
    firebase.database().ref("items").once("value", function() {
        var currentUser = firebase.auth().currentUser;
        // console.log(currentUser.uid);
        var product = new Item({ title: sinItemData.title, price: parseInt(sinItemData.price), itemKey: itemKey, seller: sinItemData.seller, sellerName: sinItemData.name }, currentUser);
        $("#items").append(product.dom);

        if (currentUser != null && currentUser.uid === sinItemData.seller) {
        product.editBtn.click(function() {
            nowItem = itemKey;
            nowSeller = sinItemData.seller;
            uploadModal.editData(sinItemData);
            uploadModal.callImage(itemKey, sinItemData.seller);
        });
    }

        product.viewBtn.click(function() {
            nowItem = itemKey;
            viewModal.writeData(sinItemData);
            viewModal.callImage(itemKey, sinItemData.seller);

            /*
              用 ViewModal 填入這筆 item 的資料
              呼叫 ViewModal callImage打開圖片
              創建一個 MessageBox 物件，將 Message 的結構顯示上 #message 裡。
            */
            var messBox = new MessageBox(firebase.auth().currentUser, itemKey);
            // item = firebase.database().ref("items/" + nowItem);
            // item.update({ "title": dataArr[0].value, "price": dataArr[1].value, "descrip": dataArr[2].value });
            $("#message").append(messBox.dom);

            /*
              判斷使用者是否有登入，如果有登入就讓 #message 容器顯示輸入框。
              在 MessageBox 上面註冊事件，當 submit 時將資料上傳。
            */
            if (currentUser) {
                $("#message").append(messBox.inputBox);
                var count = 0;
                messBox.inputBox.keypress(function(e) {
                    if (e.which == 13) {
                         e.preventDefault();
                        message = firebase.database().ref("items/" + itemKey + "/message");
                        // console.log(currentUser.displayName);
                        message.push({ "time": new Date($.now()).toLocaleString(), "message": $(this).find("#dialog").val(), "userName":currentUser.displayName, "picture": currentUser.photoURL });
                        //         取得input的內容 $(this).find("#dialog").val();
                        //         清空input的內容 
                        $(this).find("#dialog").val("");

                    }
                });
            }
            /*
            從資料庫中抓出message資料，並將資料填入MessageBox
            .orderBy("time")
            */
            firebase.database().ref("items/" + itemKey + "/message").on("value", function(data) {
                messBox.refresh();
                var data = data.val();
                for (var i in data) {
                    // console.log(data[i]);
                    messBox.addDialog({
                        message: data[i].message,
                        time: data[i].time,
                        name: data[i].userName,
                        picURL: data[i].picture
                    });
                }
            });
        });
    });

    /*
    如果使用者有登入，替 editBtn 監聽事件，當使用者點選編輯按鈕時，將資料顯示上 uploadModal。
    */
    // })
}

function generateDialog(diaData, messageBox) {


}
