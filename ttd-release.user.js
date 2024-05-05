// ==UserScript==
// @name         Test To Discord
// @namespace    http://tampermonkey.net/
// @version      v1.0.0
// @description  專門為翰林雲端學院設計的傳送題目到Discord的Tempermonkey「腳本」
// @author       Know Scratcher
// @match        https://*.teamslite.com.tw/student/selfassReport.html*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=teamslite.com.tw
// @grant       unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    let webhook = "";

    let choice_prefix = ["A) ","B) ","C) ","D) ","E) ","F) ","G) ","H) ","I) "];
    let answers = ["A","B","C","D","E","F","G","H","I"];
    let body = {
        "content": "",
        "tts": false,
        "embeds": [
            {
            "title": "-----題目報告-----",
            "description": "",
            "color": 16711680,
            "fields": []
            }
        ],
        "components": [],
        "actions": {}
    };
    /* {
            "title": "題目報告",
            "description": "**1.**\nlol\n**2.**\nlol",
            "color": 2326507,
            "fields": []
    }*/

    let questions = [];
    let buttons = document.getElementsByClassName("btn btn-default responsive_btn circle20Button doubtButton");
    for (var i=0;i<buttons.length;i++) {
        questions.push(buttons[i].getAttribute("data-question"));
    }
    console.log(questions);

    unsafeWindow.getQuestion = async function getQuestion(id) {
        return fetch(`https://cysh.teamslite.com.tw/_id/${id}/Question`)
            .then((response) => response.json())
            .then((json) => {return json});
    }

    async function rpc(str) {
        str = str.replace(/<br>/g,"\n");
        str = str.replace(/<[^>]*>/g,"");
        return str;
    }

    async function choice(choice) {
        for (var j=0;j<choice.length;j++) {
            choice[j] = choice[j].replace(/<br>/g,"\n");
            choice[j] = choice[j].replace(/<[^>]*>/g,"");
            choice[j] = choice_prefix[j] + choice[j]+"\n";
        }
        return choice;
    }
    unsafeWindow.start = async function start() {
        alert("準備開始傳送");
        let range = document.getElementById("exanRange").innerHTML;
        range = range.replace(/<li>/g,"");
        range = range.replace(/<\/li>/g,"\n");
        range = range.replace(/<[^>]*>/g,"");
        body = {
            "content": "",
            "tts": false,
            "embeds": [
                {
                "title": "-----題目報告-----",
                "description": "",
                "color": 16711680,
                "fields": []
                }
            ],
            "components": [],
            "actions": {}
        };
        questions = []
        body["embeds"][0]["description"] = `翰林雲端學院\n**測驗範圍**\n${range}`
        for (var i=0;i<buttons.length;i++) {
            questions.push(buttons[i].getAttribute("data-question"));
        }
        document.getElementById("todc").removeAttribute("onclick");
        document.getElementById("todc").innerHTML = `<font>正在處理</font>`;
        let count = 0
        while (count<questions.length) {
            await generate_report(questions[count]);
            await send();
            count++;
            document.getElementById("todc").innerHTML = `<font>已處理${count}/${questions.length}</font>`;
        }
        document.getElementById("todc").innerHTML = `<font>重新傳送</font>`;
        document.getElementById("todc").setAttribute("onclick","start();");
        alert("完成");
    }
    //questions.forEach((element) => async function() {
    async function generate_report(element) {
        let json = await getQuestion(element);
        let data = json["result"][0];
        if (data["genre"] == "parent") { // 題組
            body["embeds"].push(
                {
                    "title": "題目報告-題組題",
                    "description": await rpc(data["question"]),
                    "color": 2326507,
                    "fields": [
                        {
                            "name": "id",
                            "value": data["_id"],
                            "inline": true
                        },
                        {
                            "name": "上傳時間",
                            "value": new Date(data["originUpdateDate"]).toString(),
                            "inline": true
                        },
                        {
                            "name": "正答率",
                            "value": `${Math.floor(data["difficultRate"]*100)}%`,
                            "inline": true
                        },
                        {
                            "name": "平均答題速度",
                            "value": `${Math.floor(data["tEachDuration"])}s`,
                            "inline": true
                        },
                        {
                            "name": "特殊標籤",
                            "value": (data["features"].length != 0? data["features"].toString().replace(/,/g,""):"無"),
                            "inline": true
                        },
                        {
                            "name": "分類",
                            "value": (data["categories"].length != 0? data["categories"].toString().replace(/,/g,""):"無"),
                            "inline": true
                        }
                      ]
                }
            );
            console.log(data["child"])
            for (let v in data["child"]) {
                let child = data["child"][v]
                console.log(child)
                let data2 = await getQuestion(child);
                data2 = data2["result"][0]; // json["result"][0];
                for (var b in data2["answers"]) {
                    data2["answers"][b] = answers[data2["answers"][b]];
                }
                let choices = await choice(data2["options"])
                body["embeds"].push(
                    {
                        "title": "題目報告-題組子題",
                        "description": await rpc(data2["question"])+"\n"+ choices.toString().replace(/,/g,""),
                        "color": 2326507,
                        "fields": [
                            {
                                "name": "答案",
                                "value": `||${data2["answers"].toString().replace(/,/g,"")}||`,
                                "inline": true
                            }
                        ]
                    }
                );
            }
        }else {
            console.log(data["question"])
            for (var b in data["answers"]) {
                data["answers"][b] = answers[data["answers"][b]];
            }
            let choices = await choice(data["options"])
            body["embeds"].push(
                {
                    "title": "題目報告-單題",
                    "description": await rpc(data["question"])+"\n"+choices.toString().replace(/,/g,""),
                    "color": 2326507,
                    "fields": [
                        {
                            "name": "答案",
                            "value": `||${data["answers"].toString().replace(/,/g,"")}||`,
                            "inline": true
                        },
                        {
                            "name": "id",
                            "value": data["_id"],
                            "inline": true
                        },
                        {
                            "name": "上傳時間",
                            "value": new Date(data["originUpdateDate"]).toString(),
                            "inline": true
                        },
                        {
                            "name": "正答率",
                            "value": `${Math.floor(data["difficultRate"]*100)}%`,
                            "inline": true
                        },
                        {
                            "name": "平均答題速度",
                            "value": `${Math.floor(data["tEachDuration"])}s`,
                            "inline": true
                        },
                        {
                            "name": "特殊標籤",
                            "value": (data["features"].length != 0? data["features"].toString().replace(/,/g,""):"無"),
                            "inline": true
                        },
                        {
                            "name": "分類",
                            "value": (data["categories"].length != 0? data["categories"].toString().replace(/,/g,""):"無"),
                            "inline": true
                        }
                      ]
                }
            )
        }
    }
    //});
    async function send() {
        let header = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        return fetch(webhook,{
            method:"POST",
            headers:header,
            body:JSON.stringify(body)
        }).then(body = {
            "content": "",
            "tts": false,
            "embeds": [],
            "components": [],
            "actions": {}
        });
        
    }
    document.getElementsByClassName("col-md-10  margin-bottom-15")[0].innerHTML += "<button id='todc' class='btn green' type='button' onclick='start();'><font>傳送到Discord</font></button>"

})();