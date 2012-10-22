var Common = {
  //根据服务器IP地址进行修改
  BOSH_SERVICE: 'http://192.168.0.46:80/http-bind/',
  RESOURCE: '/YozoIM',
  MUC: 'conference.yozosoft',
  connection: null,
  show: null,
  message: function(jid, message, html_message) {
    var msg = $msg({
      to: jid,
      type: 'chat'
    }).c("body").t(message);
    msg.up();
    if (html_message != null) {
      msg.c("html", {
        xmlns: Strophe.NS.XHTML_IM
      }).c("body", {
        xmlns: Strophe.NS.XHTML
      }).h(html_message);
      if (msg.node.childNodes.length === 0) {
        var parent = msg.node.parentNode;
        msg.up().up();
        msg.node.removeChild(parent);
      } else {
        msg.up().up();
      }
    }
    msg.c('active', {xmlns: "http://jabber.org/protocol/chatstates"});
    Common.connection.send(msg);
  },
  //将JID转化成ID,例如：admin@localhost转化成admin-localhost
  jid_to_id: function (jid) {
    return Strophe.getBareJidFromJid(jid).replace(/@/g, "-").replace(/\./g, "-");
  },
  //获得消息时间，根据是否是离线消息，如果不是离线消息，则显示本地系统时间
  get_msg_time: function (message) {
    return $(message).find('delay').length === 0 ? new Date().toLocaleTimeString() : new Date($(message).find('delay').attr('stamp')).toLocaleTimeString();
  },
  //查看联系人资料
  vcard_dialog_init: function (jid, FN, NUMBER, EMAIL, URL, BDAY) {
    var jid_id = Common.jid_to_id(jid);
    if ($('#vcard-' + jid_id).length !== 0) {
      $('#vcard-' + jid_id).remove();
    }
    $('#vcard-dialogs').append(
        "<div id='vcard-" + jid_id + "'><dl class='userVcard'>" +
          "<dt>全名 :</dt><dd>" + FN +
          "</dd><dt>联系电话 :</dt><dd>" + NUMBER +
          "</dd><dt>Email地址 :</dt><dd>" + EMAIL +
          "</dd><dt>个人网站 :</dt><dd>" + URL +
          "</dd><dt>生日 :</dt><dd>" + BDAY +
        "</dd></dl></div>");
    $('#vcard-' + jid_id).dialog({
      title: jid
    });
  },
  change_name_dialog_init: function (jid) {
    var jid_id = Common.jid_to_id(jid), rosterItem = Common.connection.roster.findItem(jid);
    if ($('#change-name-' + jid_id).length === 0) {
      $('#change-name-dialogs').append(
          "<div id='change-name-" + jid_id + "'><form><fieldset>" +
            "<label>请输入备注姓名：</label>" +
            "<input type='text' class='change-name text ui-widget-content ui-corner-all'>" +
          "</fieldset></form></div>");
    }
    $('#change-name-' + jid_id + ' .change-name').val(rosterItem.name);
    $('#change-name-' + jid_id).dialog({
      title: "修改备注姓名",
      buttons: {
        "确定": function () {
          var name = $('#change-name-' + jid_id + ' .change-name').val();
          Common.connection.roster.update(jid, name, rosterItem.groups, null);
          $(this).dialog('close');
        },
        "取消": function () {
          $(this).dialog('close');
        }
      }
    });
  },
  set_subject_dialog_init: function (room) {
    var room_id = Common.jid_to_id(room);
    if ($('#set-subject-' + room_id).length === 0) {
      $('#set-subject-dialogs').append(
          "<div id='set-subject-" + room_id + "'><form><fieldset>" +
            "<label>请输入房间主题：</label>" +
            "<input type='text' class='set-subject text ui-widget-content ui-corner-all'>" +
          "</fieldset></form></div>");
    }
    $('#set-subject-' + room_id).dialog({
      title: "修改房间主题",
      buttons: {
        "确定": function () {
          var subject = $('#set-subject-' + room_id + ' .set-subject').val();
          Common.connection.muc.setTopic(room, subject);
          $(this).dialog('close');
        },
        "取消": function () {
          $(this).dialog('close');
        }
      }
    });
  },
  chat_dialog_init: function (chat_dialog, name, jid, jid_id) {
    chat_dialog.dialog({
      title: name,
      width: 600,
      minWidth: 550,//!!最小宽度，后面仍需根据窗口的富文本输入工具条来确定大小!!
      //position:[Gab.left,Gab.top],//!!窗口定位，仍需修改!!
      //create:function(ev, ui) {
      //  Gab.left += 20;//!!窗口定位，仍需修改!!
      //  Gab.top += 30;
      //},
      open: function (ev, ui) {
        //创建对话框同时创建任务栏标签
        $('#chat-tags').append("<a href='#chat-" + jid_id + "' class='chat-tag active ui-state-active'>" + name +"</a>");
        $('#chat-' + jid_id + ' textarea').focus();
        //添加最小化与最大化按钮
        Common.replace_dialog_icons(chat_dialog, jid_id);
      },
      focus: function (ev, ui) {
        $("#chat-tags a").removeClass("active ui-state-active");
        $("#chat-tags a[href='#chat-" + jid_id + "']").addClass("active ui-state-active");
        $('#chat-' + jid_id + ' textarea').focus();
      },
      close: function (ev, ui) {
        $("#chat-tags a[href='#chat-" + jid_id + "']").remove();
        Common.connection.chatstates.sendGone(jid, 'chat');
      }
    });

    $("#chat-tags a[href='#chat-" + jid_id + "']").live('click', function (ev) {
      Common.toggle_dialog(jid_id);
    });
  },
  chatroom_dialog_init: function (chat_dialog, room, room_id, nick) {
    chat_dialog.dialog({
      title: room,
      width: 600,
      minWidth: 750,//!!最小宽度，后面仍需根据窗口的富文本输入工具条来确定大小!!
      open: function (ev, ui) {
        $('#chat-tags').append("<a href='#chat-" + room_id + "' class='chat-tag active ui-state-active'>"+ room_id +"</a>");
        $('#chat-' + room_id + ' textarea').focus();
        Common.replace_dialog_icons(chat_dialog, room_id);
      },
      focus: function (ev, ui){
        $("#chat-tags a").removeClass("active ui-state-active");
        $("#chat-tags a[href='#chat-" + room_id + "']").addClass("active ui-state-active");
        $('#chat-' + room_id + ' textarea').focus();
      },
      close: function (ev, ui) {
        Groupie.leave_room(room, room_id, nick);
        $("#chat-tags a[href='#chat-" + room_id + "']").remove();
      }
    });
        
    $("#chat-tags a[href='#chat-" + room_id + "']").live('click', function (ev) {
      Common.toggle_dialog(room_id);
    });
  },
  //添加最小化与最大化按钮
  replace_dialog_icons: function (chat_dialog, id) {
    var atext = $("div[aria-labelledby='ui-dialog-title-chat-" + id + "'] .ui-dialog-titlebar-close").replaceWith(
      '<p class="ui-xlgwr"><span class="ui-icon ui-icon-minusthick">minusthick</span>' + 
      '<span class="ui-icon ui-icon-extlink">extlink</span>' + 
      '<span class="ui-icon ui-icon-closethick">close</span></p>');
    $("div[aria-labelledby='ui-dialog-title-chat-" + id + "']" + " .ui-xlgwr>span").click(function () {
      var spantext = $(this).text();
      if (spantext == "extlink") { //!!仍需修改!!
        if (window.screen) {             //判断浏览器是否支持window.screen判断浏览器
          var myw = screen.availWidth;   //定义一个myw，接受到当前全屏的宽
          var myh = screen.availHeight;  //定义一个myw，接受到当前全屏的高
          chat_dialog.dialog({
            position: ['left', 'top'],
            width: myw,
            height: myh
          });
        } else {
          chat_dialog.dialog({
            position: 'center',
            width: 800,
            height: 600
          });
        }
      } else if (spantext == "minusthick") {
        $("div[aria-labelledby='ui-dialog-title-chat-" + id + "']").hide();
      } else if (spantext == "close") {
        chat_dialog.dialog("close");
      } else {
        alert("Error!");
      }
    });
  },
  //隐藏恢复对话框
  toggle_dialog: function (id) {
    $("div[aria-labelledby='ui-dialog-title-chat-" + id + "']").toggle('highlight', 'fast', function () {
      if($(this).is(':hidden')) {
        $("#chat-tags a[href='#chat-" + id + "']").removeClass("active ui-state-active");
      } else {
        $("#chat-tags a").removeClass("active ui-state-active");
        $("#chat-tags a[href='#chat-" + id + "']").addClass("active ui-state-active");
        $('#chat-' + id + ' textarea').focus();
        $('#chat-' + id).dialog("moveToTop");
      }
    });
  },
  //从message stanza中提取消息
  get_msg_body: function (message) {
    var body = $(message).find("html > body") || $(message).find("rmhtml > body");

    if (body.length === 0) {
      body = $(message).find('body');
      if (body.length > 0) {
        body = body.text();
      } else {
        body = null;
      }
    } else {
      body = body.contents();

      var span = $("<span></span>");
      body.each(function () {
        if (document.importNode) {
          $(document.importNode(this, true)).appendTo(span);
        } else {
          // IE workaround
          span.append(this.xml);
        }
      });

      body = span.html();
    }
    return body;
  },
  //追加聊天事件
  append_chat_event: function (id, event_msg) {
    // remove all chat event
    $('#chat-' + id + ' .chat-event').remove();
    // append new chat event
    $('#chat-' + id + ' .chat-messages').append("<li class='chat-event ui-state-highlight ui-corner-all'>" + event_msg + "</li>");

    Gab.scroll_chat(id);
  },
  show_muc_dialog: function (room, room_id) {
    if ($('#chat-' + room_id).length === 0) {
      $('#muc-dialogs').append(
        "<div id='chat-" + room_id + "'>" + 
          "<div class='room-name hidden'>" + room + "</div>" + 
          "<div class='current-nick hidden'></div>" +
          "<div id='subject-" + room_id + "'>话题:<span class='room-subject'></span></div>" + 
          "<div class='room-toolbar'><input type='button' class='set-room-subject-button ui-button ui-widget ui-state-default ui-corner-all' value='设置主题'/></div>" + 
          "<div style='float:left;width:80%;'>" + 
            "<div class='chat-messages'></div>" + 
          "</div><ul class='occupant-list'></ul><div class='clear'></div>" + 
          "<textarea class='muc-input' style='width:100%'></textarea></div>");
      //$('.room-subject').editable(function (value, settings) {
        //Common.connection.muc.setTopic(room, value);
        //console.log(this);console.log(value);console.log(settings);
      //}, {
      //  indicator:'保存',
      //  tooltip:'点击编辑',
       // style:'display:inline'
      //});
      $('#chat-' + room_id + ' .set-room-subject-button').live('click', function() {
        Common.set_subject_dialog_init(room);
      });
    }
  },
  show_error: function (msg) {
    $('#error-dialog p').text(msg);
    $('#error-dialog').dialog({
      modal:true,
      buttons: {
        "确定":function () {
          $('#error-dialog p').text('');
          $(this).dialog("close");
        }
      }
    });
  }

}
var Gab = {
  //聊天对话框初始位置
  //left:100,top:100,
  get_contact_item: function (jid, jid_id, name, subscription, status) {
    var contact = "<li id='" + jid_id + "' class='contact-item'>" +
                    "<a class='" + status + "'>" +
                      "<img src='images/chat-thumb.gif' alt='' />" +
                      "<span class='contact-jid hidden'>" + jid + "</span>" +
                      "<span class='contact-name'>" + name + "</span>" + 
                      "<span class='contact-status'></span>" + 
                      "<span class='contact-subscription hidden'>" + subscription + "</span>" + 
                    "</a></li>";
    return contact;
  },
  //获得联系人列表
  get_roster: function () {
    //Sent Roster Get and get Roster Result
    Common.connection.roster.get(function (items) {
      $.each(items, function () {
        var jid = this.jid;
        var name = this.name || jid.substring(0, jid.indexOf('@'));
        var subscription = this.subscription;
        var groups = this.groups;
        var jid_id = Common.jid_to_id(jid);
        var status = "roster-contact offline";
        var contact = Gab.get_contact_item(jid, jid_id, name, subscription, status);
        Gab.insert_contact($(contact), groups);
      });
    });
  },
  //当联系人列表发生变化时执行
  on_roster_changed: function (iq) {
    $(iq).find('item').each(function () {
      var subscription = $(this).attr('subscription');
      var jid = $(this).attr('jid');
      var jid_id = Common.jid_to_id(jid);
      var name = $(this).attr('name') || jid.substring(0, jid.indexOf('@'));
      if (subscription === 'remove') {
        //删除联系人
        $('#' + jid_id).remove();
      } else {
        //添加或修改联系人
        var status = $('#' + jid_id + ' .roster-contact').attr('class') || "roster-contact offline";
        var contact = Gab.get_contact_item(jid, jid_id, name, subscription, status);
        if ($('#' + jid_id).length > 0) { //修改
          $('#' + jid_id).replaceWith(contact);
        } else { //添加
          Gab.insert_contact($(contact));
        }
      }
    });
    return true;
  },

  pending_subscriber: null,
  //收到presence stanzas时要做的处理
  on_presence: function (presence) {
    var ptype = $(presence).attr('type');
    var from = $(presence).attr('from');
    var jid_id = Common.jid_to_id(from);
    //
    if (from.indexOf('conference') < 0) {
      //如果是申请好友请求消息，例如：<presence from='user1@localhost' to='admin@localhost' type='subscribe' xmlns='jabber:client'/>
      if (ptype === 'subscribe') {
        //populate pending_subscriber, the approve-jid span, and open the dialog
        Gab.pending_subscriber = from;
        if (Common.connection.roster.findItem(from).subscription === 'to') {
          $('#authorize-and-add-radio').hide();
        } else {
          $('#authorize-and-add-radio').show();
        }
        $('#approve-jid').text(Strophe.getBareJidFromJid(from));
        $('#approve-status').text($(presence).find('status').text());
        $('#subscribe-approve-dialog').dialog('open');
      } else if (ptype !== 'error' && ptype !== 'unsubscribed') {
        //先移除所有样式，这里可以添加更多的样式，暂时只有在线黑，离开红和离线灰
        var contact = $('#roster-subpanel li#' + jid_id + ' .roster-contact')
                                .removeClass("online").removeClass("away").removeClass("offline");
        if (ptype === 'unavailable') { //离线
          contact.addClass("offline").find('.contact-status').text("");
          if ($('#chat-' + jid_id).length !== 0) {
            Common.append_chat_event(jid_id, Strophe.getNodeFromJid(from) + "离线或隐身，可能无法立即回复");
          }
        } else { //在线或离开
          var show = $(presence).find("show").text();
          var status = $(presence).find("status").text();
          if (status !== "") {
            contact.find('.contact-status').text("(" + status + ")");
          } else {
            contact.find('.contact-status').text("");
          }
          //用户为在线或空闲状态
          if (show === "" || show === "chat") {
            contact.addClass("online");
            if ($('#chat-' + jid_id).length !== 0) {
              Common.append_chat_event(jid_id, Strophe.getNodeFromJid(from) + "上线了");
            }
          } else { //其它状态
            contact.addClass("away");
            if ($('#chat-' + jid_id).length !== 0) {
              Common.append_chat_event(jid_id, Strophe.getNodeFromJid(from) + "离开(" + status + "),可能无法立即回复");
            }
          }
        }

        var li = contact.parent();
        li.remove();
        Gab.insert_contact(li);
      }
    }

    // reset addressing for user since their presence changed
    jid_id = Common.jid_to_id(from);
    $('#chat-' + jid_id).data('jid', Strophe.getBareJidFromJid(from));

    return true;
  },
  on_si_file_transfer: function (iq) {
    if ($(iq).find('si')) {
      var id = $(iq).attr('id');
      var to = $(iq).attr('from');
      var si_id = $(iq).find('si').attr('id');
      var result = $iq({type:'result', to:to, id:id})
                            .c('si', {xmlns:'http://jabber.org/protocol/si', id:si_id})
                            .c('feature', {xmlns:'http://jabber.org/protocol/feature-neg'})
                            .c('x', {xmlns:'jabber:x:data', type:'submit'})
                            .c('field', {var:'stream-method'})
                            .c('value').t('http://jabber.org/protocol/bytestreams');
      Common.connection.sendIQ(result, null, null);
    }
  },
  on_si_file_streamhost: function (iq) {
    //alert("file1");
    var id = $(iq).attr('id');
    var to = $(iq).attr('from');
    var result = $iq({type:'result', to:to, id:id})
                          .c('query', {xmlns:'http://jabber.org/protocol/bytestreams'})
                          .c('streamhost-used', {jid:to});
    Common.connection.sendIQ(result, null, null);
  },
  //收到message stanzas时要做的处理
  //<message id='c0t73-71' to='admin@yozosoft' from='user1@yozosoft/Spark 2.6.3' type='chat'>
  //  <body>hello</body><thread>zaC3Jt</thread><x xmlns='jabber:x:event'><offline/><composing/></x>
  //</message>
  on_message: function (message) {
    var full_jid = $(message).attr('from');
    var jid = Strophe.getBareJidFromJid(full_jid);
    var jid_id = Common.jid_to_id(jid);
    var msg_time = Common.get_msg_time(message);  //获得消息时间
    //判断是不是聊天室私人消息,利用聊天室的域名中有'conference'字符串,缺点：局限性
    if (jid.indexOf('conference') < 0) {
      var name = $(message).attr('name') || jid.substring(0, jid.indexOf('@'));
      //添加活动通知，参考XEP-0085
      var composing = $(message).find('composing'),  //用户正在打字
            paused = $(message).find('paused'),  //用户停止打字一段时间(如5秒)
            inactive = $(message).find('inactive'),  //用户停止打字一段时间(如30秒), 或者最小化聊天窗口
            gone = $(message).find('gone');  //用户关掉了聊天窗口
      if (gone.length === 0) {
        //如果没有创建聊天对话框，则创建
        if ($('#chat-' + jid_id).length === 0) {
          $('#chat-dialogs').append(
            "<div id='chat-"+ jid_id + "' class='chat-dialog'>" + "<ul class='chat-messages'></ul>" +
            "<textarea class='chat-input'></textarea></div>");
        }

        var chat_dialog = $('#chat-' + jid_id);
        chat_dialog.data('jid', full_jid);

        Common.chat_dialog_init(chat_dialog, name, jid, jid_id);

        if (composing.length > 0) {
          if($('#chat-' + jid_id + ' .chat-event').length === 0) {
            Common.append_chat_event(jid_id, Strophe.getNodeFromJid(jid) + "正在输入");
          }
        }

        if (paused.length > 0 || inactive.length > 0 || gone.length > 0) {
          $('#chat-' + jid_id + ' .chat-event').remove();
        }

        var body = Common.get_msg_body(message);
        
        if (body) {
          // remove notifications since user is now active
          $('#chat-' + jid_id + ' .chat-event').remove();

          if($('#chat-' + jid_id + ' .chat-messages li').length === 0 || $('#chat-' + jid_id + ' .chat-messages li:last span').hasClass('me')) {
            // add the new message
            $('#chat-' + jid_id + ' .chat-messages').append(
              "<li class='chat-message'>" +
                "<img class='avatar' src='images/head.png' height='48' width='48'><span class='chat-name'>" +
                Strophe.getNodeFromJid(jid) +
                "</span><span class='chat-msg-time'>" + msg_time + "</span><br/><span class='chat-text'>" +
                "</span></li>");
          } else {
            $('#chat-' + jid_id + ' .chat-messages li:last').append("<span class='chat-text'></span>")
          }

          $('#chat-' + jid_id + ' .chat-messages li:last .chat-text:last').append(body);

          Gab.scroll_chat(jid_id);
        }
      } else {
        $('#chat-' + jid_id + ' .chat-event').remove();
      }
    }

    return true;
  },

  scroll_chat: function (jid_id) {
    var div = $('#chat-' + jid_id + ' .chat-messages').get(0);
    div.scrollTop = div.scrollHeight;
  },


  presence_value: function (elem) {
    if (elem.hasClass('online')) {
      return 2;
    } else if (elem.hasClass('away')) {
      return 1;
    }

    return 0;
  },
  //有传入分组参数，但还未加入分组功能
  insert_contact: function (elem, groups) {
    var jid = elem.find('.contact-jid').text();
    var pres = Gab.presence_value(elem.find('.roster-contact'));

    var contacts = $('#roster-subpanel ul li');

    if (contacts.length > 0) {
      var inserted = false;
      contacts.each(function () {
        var cmp_pres = Gab.presence_value($(this).find('.roster-contact'));
        var cmp_jid = $(this).find('.contact-jid').text();

        if (pres > cmp_pres) {
          $(this).before(elem);
          inserted = true;
          return false;
        } else if (pres === cmp_pres) {
          if (jid < cmp_jid) {
            $(this).before(elem);
            inserted = true;
            return false;
          }
        }
      });

      if (!inserted) {
        $('#contact-list').append(elem);
      }
    } else {
      $('#contact-list').append(elem);
    }
  }

};

var SOCKS5 = {
  getProxy: function() {
    var jid = 'proxy.yozosoft'
    var iq = $iq({to:jid, type:'get'}).c('query', {xmlns:'http://jabber.org/protocol/bytestreams'});
    Common.connection.sendIQ(iq, function (iq) {
      var port = $(iq).find('streamhost').attr('port');
      var host = $(iq).find('streamhost').attr('host');
      var toRequester = $iq({to:'user1@yozosoft/Spark 2.6.3', from:'admin@yozosoft/YozoIM', type:'set'}).c('query', {xmlns:'http://jabber.org/protocol/bytestreams', mode:'tcp'}).c('streamhost', {port:port, host:host, jid:jid});
      Common.connection.sendIQ(toRequester, null, null);
    }, null);
  }
};

var Groupie = {
  joined: [],
  //Groupie.occupants[room_nick] = user_jid || true
  occupants: [],

  on_room_items: function (iq) {
    var list = $('#chatrooms').empty();
    $(iq).find("item").each(function () {
      var jid = $(this).attr("jid");
      var room_name = $(this).attr('name') || jid.substring(0, jid.indexOf('@'));
      list.append("<li class='item'><a class='room' title='" + jid + "'>" + room_name + "</a></li>");
    });
  },
  
  on_invitation: function (message) {
    //var from = $(message).attr('from');
    var from = $(message).find('invite').attr('from');
    var from_nick = from.substring(0, from.indexOf('@'));
    var to = $(message).attr('to');
    var to_nick = to.substring(0, to.indexOf('@'));
    var room = $(message).find("x[xmlns='jabber:x:conference']").attr('jid');
    //var room_id = Common.jid_to_id(room);
    $('#invite-approve-dialog').empty().append("<span class='room hidden'>" + room + "</span>" + 
      "<span class='nick hidden'>" + to_nick + "</span>" + 
      "<span>" + from_nick + " 正邀请您加入 " + room + "</span>");
    $('#invite-approve-dialog').dialog('open');
  },

  on_presence: function (presence) {
    var from = $(presence).attr('from');
    var room = Strophe.getBareJidFromJid(from);
    var room_id = Common.jid_to_id(room);

    if ($(presence).find("status[code='307']").length > 0) {
      var reason = $(presence).find('reason').text();
      $('#chat-' + room_id).dialog('close');
      Common.show_error(reason);
      return false;
    }
    //information get from presence stanza
    
    var ptype = $(presence).attr('type');
    var affiliation = $(presence).find('item').attr('affiliation');
    var role = $(presence).find('item').attr('role');
    //from = 'room@service/nick'
    var nick = Strophe.getResourceFromJid(from);
    var show = $(presence).find('show').text();
    var room_nick = Common.connection.muc.test_append_nick(room, nick);
    
    var is_occupant = Groupie.occupants[room_nick];
    
    if (ptype === 'error' && !Groupie.joined[room]) {
      // error joining room
      $('#chat-' + room_id).dialog("destroy");
      $("#chat-tags a[href='#chat-" + room_id + "']").remove();
      Common.connection.muc.leave(room, nick, null, null);
      if ($(presence).find("not-authorized").length !== 0) { //Service Denies Access Because No Password Provided
        Common.show_error("It's a password-protected room, you need to enter the password.");
      } else if ($(presence).find("forbidden").length !== 0) { //Service Denies Access Because User is Banned
        Common.show_error("You are banned from the room.");
      } else if ($(presence).find("item-not-found").length !== 0) { //Service Denies Access Because Room Does Not (Yet) Exist
        Common.show_error("The room does not exist.");
      } else if ($(presence).find("not-allowed").length !== 0) {
        Common.show_error("Room creation is restricted.");
      } else if ($(presence).find("not-acceptable").length !== 0) {
        Common.show_error("The reserved roomnick must be used.");
      } else if ($(presence).find("registration-required").length !== 0) { //Service Denies Access Because User Is Not on Member List
        Common.show_error("You are not on the member list.");
      } else if ($(presence).find("conflict").length !== 0) { //Service Denies Access Because of Nick Conflict
        Common.show_error("The nick is already in used.");
      } else if ($(presence).find("service-unavailable").length !== 0) { //Service Informs User that Room Occupant Limit Has Been Reached
        Common.show_error("The maximum number of users has been reached.");
      }
      return false;
    } else if (!is_occupant && ptype !== 'unavailable') {
      var is_change_nick = ($('body').data('change_nick') === nick);
      // add to occupant list  加入聊天室
      var user_jid = $(presence).find('item').attr('jid') || "";
      Groupie.occupants[room_nick] = user_jid || true;
      is_occupant = true;
      $('#chat-' + room_id + ' .occupant-list').append('<li class="occupant-item roster-contact ' + role + ' ' + affiliation + ' ' + show + '">' + 
          '<span class="contact-name">' + nick + '</span>' + 
          '<span class="contact-jid hidden">' + user_jid + '</span></li>');
      // 显示"nickname加入聊天室"
      if (Groupie.joined[room] && !is_change_nick) {
        $(document).trigger('user_joined', {room:room, nick:nick});
      }
      if (is_change_nick) {
        $('body').removeData('change_nick');
      }
    } else if (is_occupant && ptype !== 'unavailable') {
      //如果用户已加入房间，则更新用户的role和affiliation
      $('#chat-' + room_id + ' .occupant-list li').each(function () {
        if (nick === $(this).find('.contact-name').text()) {
          $(this).removeClass('moderator').removeClass('participant').removeClass('visitor')
            .removeClass('owner').removeClass('admin').removeClass('member')
            .removeClass('away')
            .addClass(role).addClass(affiliation).addClass(show);
          return false;
        }
      });
    } else if (is_occupant && ptype === 'unavailable') {
      //用户离开会议室(或修改昵称),从occupant list中移除用户
      $('#chat-' + room_id + ' .occupant-list li').each(function () {
        if (nick === $(this).find('.contact-name').text()) {
          $(this).remove();
          return false;
        }
      });
      delete Groupie.occupants[room_nick];
      //通过状态码303,判断是否为修改昵称
      if ($(presence).find("status[code='303']").length > 0) {
        var new_nick = $(presence).find('item').attr('nick');
        
        $(document).trigger('change_nick', {room:room, old_nick:nick, new_nick:new_nick});
        $('body').data('change_nick', new_nick);
      } else {
        $(document).trigger('user_left', {room:room, nick:nick});
      }
    }
    
    var current_ncik = $('#chat-' + room_id + ' .current-nick').text();
    if (nick === current_ncik) {
      $('#chat-' + room_id + ' .occupant-list li').each(function () {
        if (nick === $(this).find('.contact-name').text()) {
          $(this).removeClass('roster-contact').addClass('me');
          return false;
        }
      });
    }

    if (ptype !== 'error' && !Groupie.joined[room]) {
      // check for status 110 to see if it's self-presence
      if ($(presence).find("status[code='110']").length > 0) {
        // check if server changed our nick
        //if ($(presence).find("status[code='210']").length > 0) {
        //  nick = Strophe.getResourceFromJid(from);
        //}
        // room join complete
        $(document).trigger("room_joined", room);
alert(affiliation);
        if(affiliation === 'owner' && $('.invite-member-button').length === 0) {
          $('#chat-' + room_id + ' .room-toolbar').append("<input type='button' class='invite-member-button ui-button ui-widget ui-state-default ui-corner-all' value='邀请'/>");
          //全选
          $("#btn1").click(function(){
            $("input[name='checkbox']").attr("checked","true"); 
          });
          //取消全选
          $("#btn2").click(function(){
            $("input[name='checkbox']").removeAttr("checked"); 
          });
          
          $('#invite-member-dialog').dialog({
            title:'邀请',
            autoOpen:false,
            buttons: {
              "取消":function () {
                $(this).dialog("close");
              },
              "邀请":function () {
                $("input[name='checkbox']:checkbox:checked").each(function(){ 
                  var jid = $(this).val();
                  Common.connection.muc.invite(room, jid, 'Welcome');
                }) 
              }
            },
            open:function (ev, ui) {
              $('#invite-member-dialog ul').empty();
              $.each(Common.connection.roster.items, function() { 
                $('#invite-member-dialog ul').append('<li><input type="checkbox" style="display:inline;" name="checkbox" value="' + this.jid +'">' + this.jid + '</li>');
              });
            }
          });

          $('.invite-member-button').live('click', function () {
            $('#invite-member-dialog').dialog('open');
          });
        }
      }
    }

    return true;
  },

  on_muc_message: function (message) {
    if ($(message).find("x[xmlns='jabber:x:conference']").length > 0) {
      //var from = $(message).attr('from');
      var from = $(message).find('invite').attr('from');
      var from_nick = from.substring(0, from.indexOf('@'));
      var to = $(message).attr('to');
      var to_nick = to.substring(0, to.indexOf('@'));
      var room = $(message).find("x[xmlns='jabber:x:conference']").attr('jid');
      //var room_id = Common.jid_to_id(room);
      $('#invite-approve-dialog').empty().append("<span class='room hidden'>" + room + "</span>" + 
        "<span class='nick hidden'>" + to_nick + "</span>" + 
        "<span>" + from_nick + " 正邀请您加入 " + room + "</span>");
      $('#invite-approve-dialog').dialog('open');
    } else {
      var from = $(message).attr('from');
      var room = Strophe.getBareJidFromJid(from);
      var room_id = Common.jid_to_id(room);
      var nick = Strophe.getResourceFromJid(from);
      var self_nick = Common.connection.muc.rooms[room].nick;
      var msg_time = Common.get_msg_time(message);
      var type = $(message).attr('type');
      var notice = !nick;

      // messages from ourself will be styled differently
      var nick_class = "chat-name";
      if (nick === self_nick) {
        nick_class += " me";
        nick = "你";
      }

      var body = Common.get_msg_body(message);
      // look for room topic change
      var subject = $(message).children('subject').text();
      if (subject) {
      //if (subject && !body) {
        $('#subject-' + room_id + ' .room-subject').text(subject);
        Groupie.add_message(room_id, "<div class='notice ui-state-highlight ui-corner-all'>" + " * " + nick + "把主题设置为: " + subject + "<span class='chat-msg-time'>" + msg_time + "</span></div>");
      } else if (body) {
        if (!notice) {
          var delayed = $(message).children("delay").length > 0 || $(message).children("x[xmlns='jabber:x:delay']").length > 0;
          var delay_css = delayed ? " delayed" : "";

          var action = body.match(/\/me (.*)$/);
          if (!action) {
            if (type !== "chat") {
              Groupie.add_message(room_id, 
                            "<div class='message" + delay_css + "' id='" + nick + "'><span class='" + nick_class + "'>" +
                            nick + "</span><span class='chat-msg-time'>" + msg_time + "</span><br/><span class='muc-chat-text'>" +
                            body + "</span></div>", body, nick);
            } else {
              Groupie.add_message(room_id, 
                            "<div class='message private' id='" + nick + "from'><span class='" + nick_class + "'>@@ " +
                            nick + " 对你说 @@</span><span class='chat-msg-time'>" + msg_time + "</span><br/><span class='muc-chat-text'>" +
                            body + "</span></div>", body, nick + 'from');
            }
          } else {
            Groupie.add_message(room_id, 
                          "<div class='message action " + delay_css + "'>" + nick + " " + action[1] + 
                          "<span class='chat-msg-time'>" + msg_time + "</span></div>");
          }
        } else {
          Groupie.add_message(room_id, "<div class='notice ui-state-highlight ui-corner-all'>* " + body + "<span class='chat-msg-time'>" + msg_time + "</span></div>");
        }
      }
    }

    return true;
  },

  add_message: function (room_id, msg, body, nick) {
    // detect if we are scrolled all the way down
    var chat = $('#chat-' + room_id +' .chat-messages').get(0);
    var at_bottom = chat.scrollTop >= chat.scrollHeight - chat.clientHeight;
    if (nick) {
      var last_msg_div = $('#chat-' + room_id + ' .chat-messages div:last');
      if (nick === last_msg_div.attr('id')) {
        last_msg_div.append('<span class="muc-chat-text">' + body + '</span>');
      } else {
        $('#chat-' + room_id +' .chat-messages').append(msg);
      }
    } else {
        $('#chat-' + room_id +' .chat-messages').append(msg);
    }
    // if we were at the bottom, keep us at the bottom
    if (at_bottom) {
      chat.scrollTop = chat.scrollHeight;
    }
  },
  
  leave_room: function (room, room_id, nick) {
    Common.connection.muc.leave(room, nick, null, null);
    $('#chat-' + room_id + ' .chat-messages').empty();
    //var nick = $(this).find('.current-nick').text();
    //var room_nick = Common.connection.muc.test_append_nick(room, nick);
    $('#chat-' + room_id + ' .occupant-list li').each(function () {
      //if (nick === $(this).find('.roster-name').text()) {
      //  $(this).remove();
      //  return false;
      //}
      var nick = $(this).find('.contact-name').text();
      var room_nick = Common.connection.muc.test_append_nick(room, nick);
      $(this).remove();
      delete Groupie.occupants[room_nick];
    });
    //delete Groupie.occupants[room_nick];
    Groupie.joined[room] = false;
  }
};

$(document).ready( function () {
  //显示/隐藏工具条
  $('#yozoim-hide').click( function () {
    $('#yozoim-base').hide();
    $('#yozoim-hidden').show();
  });
  $('#yozoim-hidden').click( function () {
    $('#yozoim-base').show();
    $('#yozoim-hidden').hide();
  });

  //Adjust panel height
  $.fn.adjustPanel = function () {
    //Reset subpanel and ul height
    $(this).find("ul, .subpanel").css({'height':'auto'});
    //Get the height of the browser viewport
    var windowHeight = $(window).height();
    //Get the height of subpanel
    var panelSub = $(this).find(".subpanel").height();
    //Viewport height - 100px (Sets max height of subpanel)
    var panelAdjust = windowHeight - 100;
    //Calculate ul size after adjusting sub-panel (27px is the height of the base panel),标题栏的高度为25px
    var ulAdjust =  panelAdjust - 25;
    //If subpanel is taller than max height...
    if (panelSub >= panelAdjust) {
      $(this).find(".subpanel").css({'height':panelAdjust});
      $(this).find("ul").css({'height':ulAdjust});
    } //If subpanel is smaller than max height...
    else if (panelSub < panelAdjust) {
      $(this).find("ul").css({'height':'auto'});
    }
  };
  //Execute function on load
  $("#vcard-panel").adjustPanel();
  $("#status-panel").adjustPanel();
  $("#roster-panel").adjustPanel();
  $("#chatrooms-panel").adjustPanel();
  //Each time the viewport is adjusted/resized, execute the function
  $(window).resize(function () {
    $("#vcard-panel").adjustPanel();
    $("#status-panel").adjustPanel();
    $("#roster-panel").adjustPanel();
    $("#chatrooms-panel").adjustPanel();
  });

  //Click event on Chat Panel
  $("#status-panel a:first, #roster-panel a:first").click(function () {
    //If subpanel is already active...
    if ($(this).next(".subpanel").is(':visible')) {
      $(this).next(".subpanel").hide();
      $("#yozoim-base li a").removeClass('active ui-state-active');
    } else { //If subpanel is not active...
      $(".subpanel").hide();
      $(this).next(".subpanel").toggle();
      $("#yozoim-base li a").removeClass('active ui-state-active');
      $(this).toggleClass('active ui-state-active');
    }
    return false; //Prevent browser jump to link anchor
  });

  $("#vcard-panel a:first").click(function () {
    Common.connection.vcard.get(function (iq) {
      $('#vcard-fn').val($(iq).find('FN').text());
      $('#vcard-number').val($(iq).find('NUMBER').text());
      $('#vcard-email').val($(iq).find('USERID').text());
      $('#vcard-website').val($(iq).find('URL').text());
      $('#vcard-bday').val($(iq).find('BDAY').text());
    });
    //If subpanel is already active...
    if ($(this).next(".subpanel").is(':visible')) {
      $(this).next(".subpanel").hide();
      $("#yozoim-base li a").removeClass('active ui-state-active');
    } else { //If subpanel is not active...
      $(".subpanel").hide();
      $(this).next(".subpanel").toggle();
      $("#yozoim-base li a").removeClass('active ui-state-active');
      $(this).toggleClass('active ui-state-active');
    }
    return false; //Prevent browser jump to link anchor
  });

  $("#chatrooms-panel a:first").click(function() {
    Common.connection.muc.listRooms(Common.MUC, function(iq) {
      Groupie.on_room_items(iq);
    }, null);
    //If subpanel is already active...
    if ($(this).next(".subpanel").is(':visible')) {
      $(this).next(".subpanel").hide();
      $("#yozoim-base li a").removeClass('active ui-state-active');
    } else { //If subpanel is not active...
      $(".subpanel").hide();
      $(this).next(".subpanel").toggle();
      $("#yozoim-base li a").removeClass('active ui-state-active');
      $(this).toggleClass('active ui-state-active');
    }
    return false; //Prevent browser jump to link anchor
  });

  //Click minusthick icon
  $('#yozoim-base .ui-icon-minusthick').click(function() {
    //hide subpanel
    $(".subpanel").hide();
    // remove active class on subpanel trigger
    $("#yozoim-base li a").removeClass('ui-state-active active');
  });
  
  $.contextMenu({
    selector:'.contact-item',
    callback:function (key, options) {
      var m = "clicked: " + key;
      window.console && console.log(m);
    },
    items: {
      "sep1": "---------",
      "name": {
        name:"修改备注",
        icon:"name",
        callback:function (key, options) {
          var jid = $(this).find('.contact-jid').text();
          Common.change_name_dialog_init(jid);
        }
      },
      "vcard": {
        name:"查看资料",
        icon:"vcard",
        callback:function (key, options) {
          var jid = $(this).find('.contact-jid').text();
          Common.connection.vcard.get(function (iq) {
            var full_name = $(iq).find('FN').text();
            var phone_number = $(iq).find('NUMBER').text();
            var email_address = $(iq).find('USERID').text();
            var website = $(iq).find('URL').text();
            var birthday = $(iq).find('BDAY').text();
            //console.log(full_name + phone_number + email_address + website + birthday);
            Common.vcard_dialog_init(jid, full_name, phone_number, email_address, website, birthday);
          }, jid, null);
        }
      },
      "delete": {
        name:"删除联系人",
        icon:"delete",
        callback:function (key, options) {
          var jid = $(this).find('.contact-jid').text();
          Common.connection.roster.remove(jid, null);
        }
      }
    }
  });
  
  $.contextMenu({
    selector:'.occupant-item',
    callback:function (key, options) {
      var m = "clicked: " + key;
      window.console && console.log(m);
    },
    items: {
      "sep1": "---------",
      "msg": {
        name:"悄悄话",
        icon:"msg",
        callback:function (key, options) {
          //var jid = $(this).find(".contact-jid").text();
          var name = $(this).find(".contact-name").text();
          //if (jid !== "") {
          //  var jid_id = Common.jid_to_id(jid);
          //  //如果没有创建聊天对话框，则创建
          //  if ($('#chat-' + jid_id).length === 0) {
          //    $('#chat-dialogs').append(
          //      "<div id='chat-"+ jid_id + "' class='chat-dialog'><ul class='chat-messages'></ul>" + 
          //      "<textarea class='chat-input'></textarea></div>");
          //    $('#chat-' + jid_id).data('jid', jid);
          //  }
          //  var chat_dialog = $('#chat-' + jid_id);
          //  Common.chat_dialog_init(chat_dialog, name, jid, jid_id);
          //} else {
          $(this).parent().parent().find('.muc-input').focus().val("/private " + name + " ");
          //}
        }
      },
      //"kick": {
      //  name:"踢出",
      //  icon:"kick",
      //  callback:function (key, options) {
      //    var room = $(this).parents().find('.room-name').text();
      //   var nick = $(this).find(".contact-name").text();
      //    Common.connection.muc.kick(room, nick, "你被踢出房间", null, null);
      //  }
      //}
    }
  });

  //登录对话框，仍需美化
  $('#login-dialog').dialog({
    autoOpen: true,
    modal: true,
    resizable:false,
    title: '登录',
    buttons: {
      "登录": function () {
        $(document).trigger('connect', {
          jid: $('#jid').val().toLowerCase() + Common.RESOURCE,
          password: $('#password').val()
        });

        $('#password').val('');
        $(this).dialog('close');
      }
    }
  });
  //修改在线状态，包括修改状态栏标签，状态包含online | chat | away | dnd | xa | invisible | offline
  $('.change_status').live('click', function () {
    var show = $(this).find('a').attr('title');
    if (show === 'online') {
      var pres = $pres({from:Common.connection.jid});
      Common.connection.send(pres);
      $('.status-tab').text('在线').css('color', 'green');
    } else if (show === 'chat') {
      var pres = $pres({from:Common.connection.jid}).c('show').t('chat').up().c('status').t('空闲');
      Common.connection.send(pres);
      $('.status-tab').text('空闲').css('color', 'green');
    } else if (show === 'away') {
      var pres = $pres({from:Common.connection.jid}).c('show').t('away').up().c('status').t('暂时离开');
      Common.connection.send(pres);
      $('.status-tab').text('暂时离开').css('color', 'red');
    } else if (show === 'dnd') {
      var pres = $pres({from:Common.connection.jid}).c('show').t('dnd').up().c('status').t('请勿打扰');
      Common.connection.send(pres);
      $('.status-tab').text('请勿打扰').css('color', 'red');
    } else if (show === 'xa') {
      var pres = $pres({from:Common.connection.jid}).c('show').t('xa').up().c('status').t('长时间离开');
      Common.connection.send(pres);
      $('.status-tab').text('长时间离开').css('color', 'red');
    } else if (show === 'invisible') { //这种实现方式较简单，但不规范
      var pres = $pres({from:Common.connection.jid, type:"invisible"});
      Common.connection.send(pres);
      $('.status-tab').text('隐身').css('color', 'grey');
    } else if (show === 'offline') { //未清理窗口，仍需修改
      Common.connection.disconnect();
      Common.connection = null;
      $('.status-tab').text('离线').css('color', 'grey');
    }
    $("#status-subpanel").hide();
    $("#yozoim-base li a").removeClass('active ui-state-active');
  });
  
  $('.statusbutton').button();
  $('.statusbutton').click(function () {
    var status = $('#mystatus').val();
    var show = $('#statustype').val();
    var show_txt = $('#statustype').find("option:selected").text();
    if (show === 'online') show = '';
    var pres = $pres({from: Common.connection.jid}).c('show').t(show).up().c('status').t(status);
    Common.connection.send(pres);
    $('.status-tab').text(show_txt + '(' + status + ')');
    if (show === '' || show === 'chat') {
      $('.status-tab').css('color', 'green');
    } else {
      $('.status-tab').css('color', 'red');
    }
    $("#status-subpanel").hide();
    $("#yozoim-base li a").removeClass('active ui-state-active');
  });

  $('.vcardbutton').button();
  $('.vcardbutton').click(function () {
    var iq;
    iq = $iq({type: "set"});
    iq.c("vCard", {
      xmlns: Strophe.NS.VCARD
    }).c("FN").t($('#vcard-fn').val()).up()
    .c("TEL").c("NUMBER").t($('#vcard-number').val()).up().up()
    .c("EMAIL").c("USERID").t($('#vcard-email').val()).up().up()
    .c("URL").t($('#vcard-website').val()).up()
    .c("BDAY").t($('#vcard-bday').val());
    Common.connection.sendIQ(iq, null, null);
  });



  $('#add-a-roster-item-dialog').dialog({
    autoOpen: false,
    draggable: true,
    resizable: false,
    title: '添加联系人',
    buttons: {
      "添加": function () {
        $(document).trigger('add_a_roster_item', {
          jid: $('#new-contact-jid').val().toLowerCase(),
          name: $('#new-contact-name').val(),
          status: $('#new-contact-status').val()
        });

        $('#new-contact-jid').val('');
        $('#new-contact-name').val('');
        $('#new-contact-status').val('');

        $(this).dialog('close');
      }
    }
  });
  $('#add-a-roster-item-link').click(function (ev) {
    $('#add-a-roster-item-dialog').dialog('open');
  });
  
  //删除联系人
  $('.remove-contact').live('click', function () {
    var jid = $(this).find('.contact-jid').text();
    Common.connection.roster.remove(jid, null);
  });
  
  //好友请求对话框
  $('#subscribe-approve-dialog').dialog({
    autoOpen: false,
    draggable: true,
    modal: false,
    title: '好友请求',
    buttons: {
      "确定": function () {
        var radio_value = $("input[name='subscribe-approve-radio']:checked").val();
        if (radio_value === 'authorize-and-add') {
          //同意并发送好友请求
          var status = $('#subscribe-status').val();
          var name = $('#subscribe-name').val();
          Common.connection.roster.authorize(Gab.pending_subscriber, "");
          Common.connection.roster.add(Gab.pending_subscriber, name, "", null);
          Common.connection.roster.subscribe(Gab.pending_subscriber, status);
          Gab.pending_subscriber = null;
        } else if (radio_value === 'authorize') {
          Common.connection.roster.authorize(Gab.pending_subscriber,"");
          Gab.pending_subscriber = null;
        } else if (radio_value === 'unauthorize') {
          Common.connection.roster.unauthorize(Gab.pending_subscriber,"");
          Gab.pending_subscriber = null;
        }
        $(this).dialog('close');
      },
      "取消": function () {
        $(this).dialog('close');
      }
    }
  });

  //$('.private').live('click', function () {
  //  var nick = $(this).attr('id');
  //  if (nick !== 'Me') {
  //   $(this).parent().parent().parent().find('.muc-input').focus().val("/private " + nick + " ");
  //  }
  //});

  $('.roster-contact').live('click', function () {
    var jid = $(this).find(".contact-jid").text();
    var name = $(this).find(".contact-name").text();
    if (jid !== "") {
      var jid_id = Common.jid_to_id(jid);
      //如果没有创建聊天对话框，则创建
      if ($('#chat-' + jid_id).length === 0) {
        $('#chat-dialogs').append(
          "<div id='chat-"+ jid_id + "' class='chat-dialog'><ul class='chat-messages'></ul>" + 
          "<textarea class='chat-input'></textarea></div>");
        $('#chat-' + jid_id).data('jid', jid);
      }
      var chat_dialog = $('#chat-' + jid_id);
      Common.chat_dialog_init(chat_dialog, name, jid, jid_id);
    } else {
      $(this).parent().parent().find('.muc-input').focus().val("/private " + name + " ");
    }
  });

  $('.chat-input').live('keypress', function (ev) {
    var jid = $(this).parent().data('jid');
    //按下'Enter'，发送消息
    if (ev.which === 13) {
      ev.preventDefault();

      var body = $(this).val();

      if(body){//消息不能为空
        var plain_text_body  = body.replace(/<\/?[^>]+>/gi, '');
        Common.message(jid, plain_text_body, body);
        //var message = $msg({to: jid, "type": "chat"})
        //              .c('body').t(body).up()
        //              .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});
        //Common.connection.send(message);
        //连续发送消息追加
        var chat_messages = $(this).parent().find('.chat-messages');
        if(chat_messages.find('li:last span').hasClass('me')) {
          chat_messages.find('li:last').append("<span class='chat-text'>" + body + "</span>");
        } else {
          chat_messages.append(
            "<li class='chat-message'>" +
              "<img class='avatar' src='images/head.png' height='48' width='48'>" +
              "<span class='chat-name me'>" + Strophe.getNodeFromJid(Common.connection.jid) + "</span>" +
              "<span class='chat-msg-time'>" + (new Date()).toLocaleTimeString() + "</span><br/>" + //!!这里时间显示问题尚未处理!!
              "<span class='chat-text'>" + body + "</span></li>");
        }

        Gab.scroll_chat(Common.jid_to_id(jid));

        $(this).val('');
        $(this).parent().data('composing', false);
      }
    } else {
      //未按下'Enter'键则发送'composing'(撰写)通知，关于活动通知参见文档Chat State Notifications(XEP-0085)
      var composing = $(this).parent().data('composing');
      if (!composing) {
        var notify = $msg({to: jid, "type": "chat"})
                     .c('composing', {xmlns: "http://jabber.org/protocol/chatstates"});
        Common.connection.send(notify);

        $(this).parent().data('composing', true);
      }
    }
  });

  $('#chat-dialog').dialog({
    autoOpen: false,
    draggable: false,
    modal: true,
    title: 'Start a Chat',
    buttons: {
      "Start": function () {
        var jid = $('#chat-jid').val().toLowerCase();
        var jid_id = Common.jid_to_id(jid);

        $('#chat-area').tabs('add', '#chat-' + jid_id, jid);
        $('#chat-' + jid_id).append(
          "<div class='chat-messages'></div>" +
          "<input type='text' class='chat-input'>");

        $('#chat-' + jid_id).data('jid', jid);

        $('#chat-area').tabs('select', '#chat-' + jid_id);
        $('#chat-' + jid_id + ' input').focus();


        $('#chat-jid').val('');

        $(this).dialog('close');
      }
    }
  });

  $('#new-chat').click(function () {
    $('#chat-dialog').dialog('open');
  });

  $('#roomtype').change(function () {
    if( $(this).val() === '1') {
      $("label[for='rpassword']").show();
      $('#rpassword').show();
    } else {
      $("label[for='rpassword']").hide();
      $('#rpassword').hide();
    }
  });

  // 加入聊天室对话框
  $('#create-chatroom-dialog').dialog({
    autoOpen: false,
    draggable: true,
    modal: true,
    title: '创建房间',
    buttons: {
      "加入": function () {
        var room = $('#roomname').val().toLowerCase() + '@' + Common.MUC;
        var type = $('#roomtype').val();
        var password = $('#rpassword').val();
        var room_id = Common.jid_to_id(room);
        var jid = Common.connection.jid;
        var nick = jid.substring(0, jid.indexOf('@'));
        Groupie.joined[room] = false;
        Common.connection.muc.join(room, nick, Groupie.on_muc_message, Groupie.on_presence, null, password);
        //Common.connection.muc.join(room, nick, null, Groupie.on_presence, null, password);
        if (type === '1') {
          //alert(room);
          var configiq = $iq({to:room, type:'set'})
                          .c('query', {xmlns:'http://jabber.org/protocol/muc#owner'})
                          .c('x', {xmlns:'jabber:x:data', type:'submit'})
                          .c('field', {"var":"FORM_TYPE"})
                          .c('value').t('http://jabber.org/protocol/muc#roomconfig')
                          .up().up()
                          .c('field', {"var":"muc#roomconfig_passwordprotectedroom"})
                          .c('value').t('1')
                          .up().up()
                          .c('field', {"var":"muc#roomconfig_roomsecret"})
                          .c('value').t(password);
          Common.connection.sendIQ(configiq, function () {
            //alert(password);
          },  function (iq) {
            Common.show_error($(iq).find('error').attr('type'));
          });
        } else if (type === '2') {
          var configiq = $iq({to:room, type:'set'})
                          .c('query', {xmlns:'http://jabber.org/protocol/muc#owner'})
                          .c('x', {xmlns:'jabber:x:data', type:'submit'})
                          .c('field', {"var":"FORM_TYPE"})
                          .c('value').t('http://jabber.org/protocol/muc#roomconfig')
                          //.up().up()
                          //.c('field', {"var":"muc#roomconfig_publicroom"})
                          //.c('value').t('0')
                          .up().up()
                          .c('field', {"var":"muc#roomconfig_membersonly"})
                          .c('value').t('1');
          Common.connection.sendIQ(configiq, function () {
            //alert('membersonly');
          },  function (iq) {
            Common.show_error($(iq).find('error').attr('type'));
          });
        } else {
          var configiq = $iq({to:room, type:'set'})
                          .c('query', {xmlns:'http://jabber.org/protocol/muc#owner'})
                          .c('x', {xmlns:'jabber:x:data', type:'submit'})
                          .c('field', {"var":"FORM_TYPE"})
                          .c('value').t('http://jabber.org/protocol/muc#roomconfig');
          Common.connection.sendIQ(configiq, function () {
            //alert('public room');
          },  function (iq) {
            Common.show_error($(iq).find('error').attr('type'));
          });
        }

        Common.show_muc_dialog(room, room_id);
        $("#chat-" + room_id + " .current-nick").text(nick);

        var chat_dialog = $('#chat-' + room_id);
        Common.chatroom_dialog_init(chat_dialog, room, room_id, nick);

        $(this).dialog('close');
      }
    }
  });

  // 加入聊天室对话框
  $('#join-chatroom-dialog').dialog({
    autoOpen: false,
    draggable: true,
    modal: true,
    title: '加入房间',
    buttons: {
      "加入": function () {
        var room = $('#jroomname').val().toLowerCase() + '@' + Common.MUC;
        //var type = $('#roomtype').val();
        var jpassword = $('#jpassword').val();
        var room_id = Common.jid_to_id(room);
        var jid = Common.connection.jid;
        var nick = jid.substring(0, jid.indexOf('@'));
        Groupie.joined[room] = false;

        Common.connection.muc.join(room, nick, Groupie.on_muc_message, Groupie.on_presence, null, jpassword);
        //Common.connection.muc.join(room, nick, null, Groupie.on_presence, null, jpassword);

        Common.show_muc_dialog(room, room_id);
        $("#chat-" + room_id + " .current-nick").text(nick);

        var chat_dialog = $('#chat-' + room_id);
        Common.chatroom_dialog_init(chat_dialog, room, room_id, nick);

        $(this).dialog('close');
      }
    }
  });

  $('.room').live('click', function() {
    var room_jid = $(this).attr('title');
    var room = room_jid.substring(0, room_jid.indexOf('@'));
    $('#join-chatroom-dialog #jroomname').val(room);
    $('#join-chatroom-dialog').dialog('open');
  });
  
    //invite to room approve dialog
  $('#invite-approve-dialog').dialog({
    autoOpen: false,
    draggable: true,
    modal: false,
    title: '聊天室邀请',
    buttons: {
      "拒绝": function () {
        $(this).dialog('close');
      },
      "同意": function () {
        var room = $(this).find('.room').text();
        var room_id = Common.jid_to_id(room);
        var nick = $(this).find('.nick').text();
        Groupie.joined[room] = false;
        Common.connection.muc.join(room, nick, Groupie.on_muc_message, Groupie.on_presence, null, null);
        //Common.connection.muc.join(room, nick, null, Groupie.on_presence, null, null);
        Common.show_muc_dialog(room, room_id);
        $('#chat-' + room_id + ' .cureent-nick').text(nick);
        var chat_dialog = $('#chat-' + room_id);
        Common.chatroom_dialog_init(chat_dialog, room, room_id, nick);
        $(this).dialog('close');
      }
    }
  });

  // 打开加入聊天室对话框
  $('#create-chatroom').click(function () { $('#create-chatroom-dialog').dialog('open'); });

  $('.muc-input').live('keypress', function (ev) {
    var room = $(this).parent().find('.room-name').text();
    var room_id = Common.jid_to_id(room);

    if (ev.which === 13) {
      ev.preventDefault();

      var body = $(this).val();
      var match = body.match(/^\/(.*?)(?: (.*))?$/);
      var args = null;
      if (match) {
        var self_nick = Common.connection.muc.rooms[room].nick;
        if (match[1] === "private") {
          args = match[2].match(/^(.*?) (.*)$/);
          var room_nick = Common.connection.muc.test_append_nick(room, args[1]);
          if (Groupie.occupants[room_nick]) {
            if(args[2]) {
              Common.connection.muc.message(room, args[1], args[2], args[2], "chat");
              Groupie.add_message(room_id,
                "<div class='message private' id='" + args[1] + "to'>" + 
                "<span class='chat-name me'>@@ 你对" + args[1] + "说 @@</span><span class='chat-msg-time'>" + Common.get_msg_time() + "</span> " + 
                "<br/><span class='muc-chat-text'>" + args[2] + "</span></div>", args[2], args[1] + 'to');
            }
          } else {
            Groupie.add_message(room_id, "<div class='notice error ui-state-error ui-corner-all'>" + "错误: 用户" + args[1] + "不在群内." + "</div>");
          }
        } else if (match[1] === "me" || match[1] === "action") {
          Common.connection.muc.groupchat(room, '/me ' + match[2], null);
        } else if (match[1] === "nick") {
          Common.connection.muc.changeNick(room, match[2]);
          Common.connection.muc.rooms[room].nick = match[2];
          $("#chat-" + room_id + " .current-nick").text(match[2]);
        } else if (match[1] === "topic") {
          Common.connection.muc.setTopic(room, match[2]);
        } else if (match[1] === "kick") {
          Common.connection.muc.kick(room, match[2], "Kick", null, null);
        } else if (match[1] === "ban") {
          var room_nick = Common.connection.muc.test_append_nick(room, match[2]);
          Common.connection.muc.ban(room, Groupie.occupants[room_nick], "Ban", null, null);
        } else if (match[1] === "op") {
          Common.connection.muc.op(room, match[2], "OP", null, null);
        } else if (match[1] === "deop") {
          Common.connection.muc.deop(room, match[2], "DEOP", null, null);
        } else {
          Groupie.add_message(room_id, "<div class='notice error ui-state-error ui-corner-all'>" + "错误: 不能识别的命令." + "</div>");
        }
        
        if (match[1] !== "private") {
          $(this).val('');
        } else {
          $(this).focus().val("/private " + args[1] + " ");
        }
        
      } else {
        html_message = "<p>" + body + "</p>";
        Common.connection.muc.groupchat(room, body, html_message);
        $(this).val('');
      }
    }
  });

});

$(document).bind('connect', function (ev, data) {
  var conn = new Strophe.Connection(Common.BOSH_SERVICE);

  conn.connect(data.jid, data.password, function (status) {
    if (status === Strophe.Status.CONNECTED) {
      $(document).trigger('connected');
    } else if (status === Strophe.Status.DISCONNECTED) {
      $(document).trigger('disconnected');
    }
  });

  Common.connection = conn;
  conn.rawInput = function (data) { console.log("IN:" + data); };
  conn.rawOutput = function (data) { console.log("OUT:" + data); };
});

$(document).bind('connected', function () {
  Common.connection.disco.addFeature("http://jabber.org/protocol/si/profile/file-transfer");
  Common.connection.disco.addFeature("http://jabber.org/protocol/si");
  Common.connection.disco.addFeature("http://jabber.org/protocol/bytestreams");
  //登录成功后首先获取联系人列表
  Gab.get_roster();
  //set up presence handler and send initial presence
  Common.connection.addHandler(Gab.on_presence, null, "presence");
  //当联系人列表发生变化时做出响应
  Common.connection.addHandler(Gab.on_roster_changed, "jabber:iq:roster", "iq", "set");
  Common.connection.addHandler(Gab.on_si_file_transfer, null, "iq", "set");
  Common.connection.addHandler(Gab.on_si_file_streamhost, 'http://jabber.org/protocol/bytestreams', "iq", "set");
  //handler message stanza
  Common.connection.addHandler(Gab.on_message, null, "message", "chat");
  //Common.connection.addHandler(Groupie.on_muc_message, null, "message", 'groupchat');
  //Common.connection.addHandler(Groupie.on_muc_message, null, "message", null);
  //Common.connection.addHandler(Groupie.on_muc_message, null, "message", 'normal');
  //get rooms list
  Common.connection.muc.listRooms(Common.MUC, function(iq) {
    Groupie.on_room_items(iq);
  }, null);
  Groupie.occupants = {};
  //Common.connection.send($pres().c('priority').t('-1'));
  //Send the initial presence stanza
  Common.connection.send($pres());
  $('.status-tab').text('在线').css('color', 'green');
});

$(document).bind('disconnected', function () {
  Common.connection = null;
  Gab.pending_subscriber = null;

  $('#roster-subpanel ul').empty();
  $('#chat-area ul').empty();
  $('#chat-area div').remove();

  $('#login-dialog').dialog('open');
});

//添加联系人
$(document).bind('add_a_roster_item', function (ev, data) {
  Common.connection.roster.add(data.jid, data.name, "", null);
  Common.connection.roster.subscribe(data.jid, data.status);
});

$(document).bind('room_joined', function (ev, room) {
  var room_id = Common.jid_to_id(room);
  Groupie.joined[room] = true;
  $('#chat-' + room_id + ' .room-name').text(room);
  Groupie.add_message(room_id, "<div class='notice ui-state-highlight ui-corner-all'>* 你加入了会议室.</div>")
});

$(document).bind('user_joined', function (ev, data) {
  var room_id = Common.jid_to_id(data.room);
  Groupie.add_message(room_id, "<div class='notice ui-state-highlight ui-corner-all'>* " + data.nick + "进入会议室.</div>");
});

$(document).bind('user_left', function (ev, data) {
  var room_id = Common.jid_to_id(data.room);
  Groupie.add_message(room_id, "<div class='notice ui-state-highlight ui-corner-all'>* " + data.nick + "离开会议室.</div>");
});
$(document).bind('change_nick', function (ev, data) {
  var room_id = Common.jid_to_id(data.room);
  Groupie.add_message(room_id, "<div class='notice ui-state-highlight ui-corner-all'>* " + data.old_nick + " change nick to " + data.new_nick + ".</div>");
});