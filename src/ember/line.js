﻿var FFZ = window.FrankerFaceZ,
	utils = require("../utils"),
	constants = require("../constants"),

	BAN_SPLIT = /[/\.](?:ban ([^ ]+)|timeout ([^ ]+)(?: (\d+))?)(?: (.*))?$/;


// ---------------------
// Settings
// ---------------------

FFZ.settings_info.alias_italics = {
	type: "boolean",
	value: true,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Display Aliases in Italics",
	help: "Format the names of users that have aliases with italics to make it obvious at a glance that they have been renamed.",

	on_update: function(val) {
		document.body.classList.toggle('ffz-alias-italics', val);
	}
};

FFZ.settings_info.username_display = {
	type: "select",
	options: {
		0: "Username Only",
		1: "Capitalization Only",
		2: "Display Name Only",
		3: "Username in Parenthesis",
		4: "Username in Tooltip"
	},

	category: "Chat Appearance",
	no_bttv: true,

	name: "Username Display",
	help: "How a user's name should be rendered when their display name differs from the username.",

	value: 3,

	process_value: function(val) {
		if ( typeof val === "string" ) {
			val = parseInt(val);
			if ( isNaN(val) || ! isFinite(val) )
				val = 3;
		}

		return val;
	},

	on_update: function(val) {
		var CL = utils.ember_resolve('component:chat/chat-line'),
			views = CL ? utils.ember_views() : [];

		for(var vid in views) {
			var view = views[vid];
			if ( view instanceof CL && view.buildFromHTML ) {
				view.$('.from').replaceWith(view.buildFromHTML());
				if ( view.get('msgObject.to') )
					view.$('.to').replaceWith(view.buildFromHTML(true));
			}
		}
	}
}


FFZ.settings_info.room_status = {
	type: "boolean",
	value: true,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Room Status Indicators",
	help: "Display the current room state (slow mode, sub mode, and r9k mode) next to the Chat button.",

	on_update: function() {
		if ( this._roomv )
			this._roomv.ffzUpdateStatus();
	}
};


FFZ.settings_info.replace_bad_emotes = {
	type: "boolean",
	value: true,

	category: "Chat Appearance",
	warn_bttv: "Only affects Whispers when BetterTTV is enabled.",

	name: "Fix Low Quality Twitch Global Emoticons",
	help: "Replace emoticons such as DansGame and RedCoat with cleaned up versions that don't have pixels around the edges or white backgrounds for nicer display on dark chat."
};


FFZ.settings_info.parse_emoticons = {
	type: "boolean",
	value: true,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Display Emoticons",
	help: "Display emoticons in chat messages rather than just text."
};


FFZ.settings_info.parse_emoji = {
	type: "select",
	options: {
		0: "No Images / Font Only",
		1: "Twitter Emoji Images",
		2: "Google Noto Images",
		3: "EmojiOne Images"
	},

	value: 1,

	process_value: function(val) {
		if ( val === false )
			return 0;
		if ( val === true )
			return 1;
		if ( typeof val === "string" )
			return parseInt(val || "0");
		return val;
	},

	category: "Chat Appearance",

	name: "Display Emoji",
	help: "Replace emoji in chat messages with nicer looking images from either Twitter or Google."
};


FFZ.settings_info.scrollback_length = {
	type: "button",
	value: 150,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Scrollback Length",
	help: "Set the maximum number of lines to keep in chat.",

	method: function() {
			var f = this;
			utils.prompt(
				"Scrollback Length",
				"Please enter a new maximum length for the chat scrollback. Please note that setting this too high may cause your computer to begin lagging as chat messages accumulate.</p><p><b>Default:</b> 150",
				this.settings.scrollback_length,
				function(new_val) {
					if ( new_val === null || new_val === undefined )
						return;

					new_val = parseInt(new_val);
					if ( Number.isNaN(new_val) || ! Number.isFinite(new_val) )
						new_val = 150;

					new_val = Math.max(10, new_val);

					f.settings.set("scrollback_length", new_val);

					// Update our everything.
					var Chat = utils.ember_lookup('controller:chat'),
						current_id = Chat && Chat.get('currentRoom.id');

					for(var room_id in f.rooms) {
						var room = f.rooms[room_id];
						room.room && room.room.set('messageBufferSize', new_val + ((f._roomv && !f._roomv.get('stuckToBottom') && current_id === room_id) ? 150 : 0));
					}
				});
		}
	};


FFZ.settings_info.hosted_sub_notices = {
	type: "boolean",
	value: true,

	category: "Chat Filtering",
	no_bttv: true,

	name: "Show Hosted Channel Subscriber Notices",
	help: "Display (or more specifically <i>hides</i> when disabled) notices in chat when someone subscribes to the hosted channel."
	};


FFZ.settings_info.filter_whispered_links = {
	type: "boolean",
	value: true,

	category: "Chat Filtering",
	warn_bttv: "Only affects Whispers when BetterTTV is enabled.",

	name: "Auto-Hide Potentially Dangerous Whispered Links",
	help: "Removes whispered links and displays a placeholder, with a warning that the link has not been approved by moderation or staff. Links remain accessible with an additional click."
};


FFZ.settings_info.banned_words = {
	type: "button",
	value: [],

	category: "Chat Filtering",

	warn_bttv: "Only affects Whispers when BetterTTV is enabled.",

	name: "Banned Words",
	help: "Set a list of words that will be locally removed from chat messages.",

	method: function(e, from_basic) {
			var f = this,
				old_val = this.settings.banned_words.join("\n"),
				input = utils.createElement('textarea');

			input.style.marginBottom = "20px";

			utils.prompt(
				"Banned Words",
				"Please enter a list of words or phrases that you would like to have removed from chat messages. One item per line." + (from_basic ? "" : "<hr><strong>Advanced Stuff:</strong> If you know regex, you can use regular expressions to match too! Start a line with <code>regex:</code> to trigger that behavior.<br><div class=\"small\">(Note: Your expression is wrapped in a capture group and may be joined with other expressions within that group via <code>|</code>. All regular expressions are executed with the flags <code>ig</code>.)</div>"),
				old_val,
				function(new_val) {
					if ( new_val === null || new_val === undefined )
						return;

					var vals = new_val.trim().split(/\s*\n\s*/g),
						i = vals.length;

					while(i--)
						if ( vals[i].length === 0 )
							vals.splice(i, 1);

					f.settings.set("banned_words", vals);
				},
				600, input);
		}
	};


FFZ.settings_info.keywords = {
	type: "button",
	value: [],

	category: "Chat Filtering",

	warn_bttv: "Only affects Whispers when BetterTTV is enabled.",

	name: "Highlight Keywords",
	help: "Set additional keywords that will be highlighted in chat.",

	method: function(e, from_basic) {
			var f = this,
				old_val = this.settings.keywords.join("\n"),
				input = utils.createElement('textarea');

			input.style.marginBottom = "20px";

			utils.prompt(
				"Highlight Keywords",
				"Please enter a list of words or phrases that you would like to be highlighted in chat. One item per line." + (from_basic ? "" : "<hr><strong>Advanced Stuff:</strong> If you know regex, you can use regular expressions to match too! Start a line with <code>regex:</code> to trigger that behavior.<br><div class=\"small\">(Note: Your expression is wrapped in a capture group and may be joined with other expressions within that group via <code>|</code>. All regular expressions are executed with the flags <code>ig</code>.)</div>"),
				old_val,
				function(new_val) {
					if ( new_val === null || new_val === undefined )
						return;

					// Split them up.
					var vals = new_val.trim().split(/\s*\n\s*/g),
						i = vals.length;

					while(i--)
						if ( vals[i].length === 0 )
							vals.splice(i,1);

					f.settings.set("keywords", vals);
				},
				600, input);
		}
	};


FFZ.settings_info.clickable_emoticons = {
	type: "boolean",
	value: false,

	category: "Chat Tooltips",
	warn_bttv: "Only affects Whispers when BetterTTV is enabled.",
	no_mobile: true,

	name: "Emoticon Information Pages",
	help: "When enabled, holding shift and clicking on an emoticon will open it on the FrankerFaceZ website or Twitch Emotes."
	};


FFZ.settings_info.link_info = {
	type: "boolean",
	value: true,

	category: "Chat Tooltips",
	no_bttv: true,

	name: "Link Information <span>Beta</span>",
	help: "Check links against known bad websites, unshorten URLs, and show YouTube info."
	};


FFZ.settings_info.link_image_hover = {
	type: "boolean",
	value: false,

	category: "Chat Tooltips",
	no_bttv: true,
	no_mobile: true,

	name: "Image Preview",
	help: "Display image thumbnails for links to Imgur and YouTube."
	};


FFZ.settings_info.emote_image_hover = {
	type: "boolean",
	value: false,

	category: "Chat Tooltips",
	no_mobile: true,

	name: "Emote Preview",
	help: "Display scaled up high-DPI emoticon images in tooltips to help see details on low-resolution monitors.",
	on_update: function(val) {
			this._reset_tooltips();
		}
	};


FFZ.settings_info.image_hover_all_domains = {
	type: "boolean",
	value: false,

	category: "Chat Tooltips",
	no_bttv: true,
	no_mobile: true,

	name: "Image Preview - All Domains",
	help: "<i>Requires Image Preview.</i> Attempt to show an image preview for any URL ending in the appropriate extension. <b>Warning: This may be used to leak your IP address to malicious users.</b>"
	};


FFZ.settings_info.chat_rows = {
	type: "boolean",
	value: false,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Chat Line Backgrounds",
	help: "Display alternating background colors for lines in chat.",

	on_update: function(val) {
			this.toggle_style('chat-background', !this.has_bttv && val);
			this.toggle_style('chat-setup', !this.has_bttv && (val || this.settings.chat_separators || this.settings.highlight_messages_with_mod_card));
		}
	};


FFZ.settings_info.chat_separators = {
	type: "select",
	options: {
		0: "Disabled",
		1: "Basic Line (1px solid)",
		2: "3D Line (2px groove)",
		3: "3D Line (2px groove inset)",
		4: "Wide Line (2px solid)"
	},
	value: 0,

	category: "Chat Appearance",
	no_bttv: true,

	process_value: function(val) {
		if ( val === false )
			return 0;
		else if ( val === true )
			return 1;
		else if ( typeof val === "string" )
			return parseInt(val) || 0;
		return val;
	},

	name: "Chat Line Separators",
	help: "Display thin lines between chat messages for further visual separation.",

	on_update: function(val) {
			this.toggle_style('chat-setup', !this.has_bttv && (val || this.settings.chat_rows || this.settings.highlight_messages_with_mod_card));

			this.toggle_style('chat-separator', !this.has_bttv && val);
			this.toggle_style('chat-separator-3d', !this.has_bttv && val === 2);
			this.toggle_style('chat-separator-3d-inset', !this.has_bttv && val === 3);
			this.toggle_style('chat-separator-wide', !this.has_bttv && val === 4);
		}
	};


FFZ.settings_info.old_sub_notices = {
	type: "boolean",
	value: false,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Old-Style Subscriber Notices",
	help: "Display the old style subscriber notices, with the message on a separate line."
};


FFZ.settings_info.emote_alignment = {
	type: "boolean",
	value: false,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Baseline Emoticon Alignment",
	help: "Align emotes on the text baseline, making messages taller but ensuring emotes don't overlap.",

	on_update: function(val) { document.body.classList.toggle('ffz-baseline-emoticons', !this.has_bttv && val) }
};

FFZ.settings_info.chat_padding = {
	type: "boolean",
	value: false,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Reduced Chat Line Padding",
	help: "Reduce the amount of padding around chat messages to fit more on-screen at once.",

	on_update: function(val) { this.toggle_style('chat-padding', !this.has_bttv && val); }
	};


FFZ.settings_info.high_contrast_chat = {
	type: "select",
	options: {
		'222': "Disabled",
		'212': "Bold",
		'221': "Text",
		'211': "Text + Bold",
		'122': "Background",
		'121': "Background + Text",
		'112': "Background + Bold",
		'111': 'All'
	},
	value: '222',

	category: "Chat Appearance",

	name: "High Contrast",
	help: "Display chat using white and black for maximum contrast. This is suitable for capturing and chroma keying chat to display on stream.",

	process_value: function(val) {
		if ( val === false )
			return '222';
		else if ( val === true )
			return '111';
		return val;
	},

	on_update: function(val) {
			this.toggle_style('chat-hc-text', val[2] === '1');
			this.toggle_style('chat-hc-bold', val[1] === '1');
			this.toggle_style('chat-hc-background', val[0] === '1');
		}
	};


FFZ.settings_info.chat_font_family = {
	type: "button",
	value: null,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Font Family",
	help: "Change the font used for rendering chat messages.",

	method: function() {
			var f = this,
				old_val = this.settings.chat_font_family || "";

			utils.prompt(
				"Chat Font Family",
				"Please enter a font family to use rendering chat. Leave this blank to use the default.",
				old_val,
				function(new_val) {
					if ( new_val === null || new_val === undefined )
						return;

					// Should we wrap this with quotes?
					if ( ! new_val )
						new_val = null;

					f.settings.set("chat_font_family", new_val);
				});
		},

	on_update: function(val) {
		if ( this.has_bttv || ! this._chat_style )
			return;

		var css;
		if ( ! val )
			css = "";
		else {
			// Let's escape this to avoid goofing anything up if there's bad user input.
			if ( val.indexOf(' ') !== -1 && val.indexOf(',') === -1 && val.indexOf('"') === -1 && val.indexOf("'") === -1)
				val = '"' + val + '"';

			var span = document.createElement('span');
			span.style.fontFamily = val;
			css = ".timestamp-line,.conversation-chat-line,.conversation-system-messages,.chat-history,.ember-chat .chat-messages {" + span.style.cssText + "}";
		}

		utils.update_css(this._chat_style, "chat_font_family", css);
		}
	};


FFZ.settings_info.chat_font_size = {
	type: "button",
	value: 12,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Font Size",
	help: "Make the chat font bigger or smaller.",

	method: function() {
			var f = this,
				old_val = this.settings.chat_font_size;

			utils.prompt(
				"Chat Font Size",
				"Please enter a new size for the chat font.</p><p><b>Default:</b> 12",
				old_val,
				function(new_val) {
					if ( new_val === null || new_val === undefined )
						return;

					var parsed = parseInt(new_val);
					if ( ! parsed || Number.isNaN(parsed) || parsed < 1 )
						parsed = 12;

					f.settings.set("chat_font_size", parsed);
				});
		},

	on_update: function(val) {
		if ( this.has_bttv || ! this._chat_style )
			return;

		var css;
		if ( val === 12 || ! val )
			css = "";
		else {
			var lh = Math.max(20, Math.round((20/12)*val)),
				pd = Math.floor((lh - 20) / 2);
			css = ".timestamp-line,.conversation-chat-line,.conversation-system-messages,.chat-history .chat-line,.ember-chat .chat-messages .chat-line { font-size: " + val + "px !important; line-height: " + lh + "px !important; }";
			if ( pd )
				css += ".ember-chat .chat-messages .chat-line .mod-icons, .ember-chat .chat-messages .chat-line .badges { padding-top: " + pd + "px; }";
		}

		utils.update_css(this._chat_style, "chat_font_size", css);
		FFZ.settings_info.chat_ts_size.on_update.call(this, this.settings.chat_ts_size);
		}
	};


FFZ.settings_info.chat_ts_size = {
	type: "button",
	value: null,

	category: "Chat Appearance",
	no_bttv: true,

	name: "Timestamp Font Size",
	help: "Make the chat timestamp font bigger or smaller.",

	method: function() {
			var f = this,
				old_val = this.settings.chat_ts_size;

			if ( ! old_val )
				old_val = this.settings.chat_font_size;

			utils.prompt(
				"Chat Timestamp Font Size",
				"Please enter a new size for the chat timestamp font. The default is to match the regular chat font size.",
				old_val,
				function(new_val) {
					if ( new_val === null || new_val === undefined )
						return;

					var parsed = parseInt(new_val);
					if ( parsed < 1 || Number.isNaN(parsed) || ! Number.isFinite(parsed) )
						parsed = null;

					f.settings.set("chat_ts_size", parsed);
				});
		},

	on_update: function(val) {
		if ( this.has_bttv || ! this._chat_style )
			return;

		var css;
		if ( val === null )
			css = "";
		else {
			var lh = Math.max(20, Math.round((20/12)*val), Math.round((20/12)*this.settings.chat_font_size));
			css = ".ember-chat .chat-messages .timestamp { font-size: " + val + "px !important; line-height: " + lh + "px !important; }";
		}

		utils.update_css(this._chat_style, "chat_ts_font_size", css);
		}
	};


// ---------------------
// Initialization
// ---------------------

FFZ.prototype.setup_line = function() {
	// Tipsy Handler
	jQuery(document.body).on("mouseleave", ".tipsy", function() {
		this.parentElement.removeChild(this);
	});

	// Aliases
	try {
		this.aliases = JSON.parse(localStorage.ffz_aliases || '{}');
	} catch(err) {
		this.log("Error Loading Aliases: " + err);
		this.aliases = {};
	}


	// Chat Style
	var s = this._chat_style = document.createElement('style');
	s.id = "ffz-style-chat";
	s.type = 'text/css';
	document.head.appendChild(s);

	// Initial calculation.
	FFZ.settings_info.chat_font_size.on_update.call(this, this.settings.chat_font_size);
	FFZ.settings_info.chat_font_family.on_update.call(this, this.settings.chat_font_family);


	// Chat Enhancements
	document.body.classList.toggle('ffz-alias-italics', this.settings.alias_italics);
	document.body.classList.toggle('ffz-baseline-emoticons', !this.has_bttv && this.settings.emote_alignment);

	this.toggle_style('chat-setup', !this.has_bttv && (this.settings.chat_rows || this.settings.chat_separators || this.settings.highlight_messages_with_mod_card));
	this.toggle_style('chat-padding', !this.has_bttv && this.settings.chat_padding);

	this.toggle_style('chat-background', !this.has_bttv && this.settings.chat_rows);

	this.toggle_style('chat-separator', !this.has_bttv && this.settings.chat_separators);
	this.toggle_style('chat-separator-3d', !this.has_bttv && this.settings.chat_separators === 2);
	this.toggle_style('chat-separator-3d-inset', !this.has_bttv && this.settings.chat_separators === 3);
	this.toggle_style('chat-separator-wide', !this.has_bttv && this.settings.chat_separators === 4);

	this.toggle_style('chat-hc-text', this.settings.high_contrast_chat[2] === '1');
	this.toggle_style('chat-hc-bold', this.settings.high_contrast_chat[1] === '1');
	this.toggle_style('chat-hc-background', this.settings.high_contrast_chat[0] === '1');

	this._last_row = {};

	/*this.log("Hooking the Ember Chat Line component.");
	var Line = utils.ember_resolve('component:chat-line');

	if ( Line )
		this._modify_chat_line(Line);*/

	this.log("Hooking the Ember VOD Chat Line component.");
	var VOD = utils.ember_resolve('component:vod-chat-line');
	if ( VOD )
		this._modify_vod_line(VOD);
	else
		this.log("Couldn't find VOD Chat Line component.");


	this.log("Hooking the Ember Message Line component.");
	var MLine = utils.ember_resolve('component:chat/message-line');
	if ( MLine )
		this._modify_chat_subline(MLine);
	else
		this.error("Couldn't find the Message Line component.");

	this.log("Hooking the Ember Whisper Line component.");
	var WLine = utils.ember_resolve('component:chat/whisper-line');
	if ( WLine )
		this._modify_chat_subline(WLine);
	else
		this.error("Couldn't find the Whisper Line component.");


	// Store the capitalization of our own name.
	var user = this.get_user();
	if ( user && user.name )
		FFZ.capitalization[user.login] = [user.name, Date.now()];
}


FFZ.prototype.save_aliases = function() {
	this.log("Saving " + Object.keys(this.aliases).length + " aliases to local storage.");
	localStorage.ffz_aliases = JSON.stringify(this.aliases);
}


FFZ.prototype._modify_chat_line = function(component, is_vod) {
	var f = this,
		Layout = utils.ember_lookup('service:layout'),
		Settings = utils.ember_settings();

	component.reopen({
		/*tokenizedMessage: function() {
			return [{type: 'text', text: 'hi'}];
		}.property('msgObject.message'),*/

		ffzTokenizedMessage: function() {
			try {
				return f.tokenize_chat_line(this.get('msgObject'));
			} catch(err) {
				f.error("chat-line tokenizedMessage: " + err);
				return this._super();
			}
		}.property("msgObject.message", "isChannelLinksDisabled", "currentUserNick", "msgObject.from", "msgObject.tags.emotes"),

		lineChanged: Ember.observer("msgObject.deleted", "isModeratorOrHigher", "msgObject.ffz_old_messages", "ffzTokenizedMessage", function() {
			this.$(".mod-icons").replaceWith(this.buildModIconsHTML());
			if ( this.get("msgObject.deleted") ) {
				this.$(".message").replaceWith(this.buildDeletedMessageHTML());
			} else
				this.$(".deleted,.message").replaceWith(this.buildMessageHTML());
		}),

		ffzUpdateBadges: function() {
			this.$(".badges").html(f.render_badges(f.get_line_badges(this.get('msgObject'))));
		},

		ffzUserLevel: function() {
			if ( this.get('isStaff') )
				return 5;
			else if ( this.get('isAdmin') )
				return 4;
			else if ( this.get('isBroadcaster') )
				return 3;
			else if ( this.get('isGlobalMod') )
				return 2;
			else if ( this.get('isModerator') )
				return 1;
			return 0;
		}.property('msgObject.labels.[]'),

		buildModIconsHTML: function() {
			var user = this.get('msgObject.from'),
				room_id = this.get('msgObject.room'),
				room = f.rooms && f.rooms[room_id],

				deleted = this.get('msgObject.deleted'),

				recipient = this.get('msgObject.to'),
				is_whisper = recipient && recipient.length,

				this_ul = this.get('ffzUserLevel'),
				other_ul = room && room.room && room.room.get('ffzUserLevel') || 0,

				output;

			if ( is_whisper || this_ul >= other_ul || f.settings.mod_buttons.length === 0 )
				return '';

			output = '<span class="mod-icons">';

			for(var i=0, l = f.settings.mod_buttons.length; i < l; i++) {
				var pair = f.settings.mod_buttons[i],
					prefix = pair[0], btn = pair[1], had_label = pair[2], is_emoji = pair[3],

					cmd, tip;

				if ( is_emoji ) {
					var setting = f.settings.parse_emoji,
						token = f.emoji_data[is_emoji],
						url = null;
					if ( token ) {
						if ( setting === 1 && token.tw )
							url = token.tw_src;
						else if ( setting === 2 && token.noto )
							url = token.noto_src;
						else if ( setting === 3 && token.one )
							url = token.one_src;

						if ( url )
							prefix = '<img class="mod-icon-emoji" src="' + utils.quote_attr(url) + '">';
					}
				}

				if ( btn === false ) {
					if ( deleted )
						output += '<a class="mod-icon html-tooltip unban" title="Unban User" href="#">Unban</a>';
					else
						output += '<a class="mod-icon html-tooltip ban' + (had_label ? ' custom' : '') + '" title="Ban User" href="#">' + (had_label ? prefix : 'Ban') + '</a>';

				} else if ( btn === 600 )
					output += '<a class="mod-icon html-tooltip timeout' + (had_label ? ' custom' : '') + '" title="Timeout User (10m)" href="#">' + ( had_label ? prefix : 'Timeout') + '</a>';

				else {
					if ( typeof btn === "string" ) {
						cmd = utils.replace_cmd_variables(btn, {name: user}, room && room.room, this.get('msgObject')).replace(/\s*<LINE>\s*/g, '\n');
						tip = "Custom Command" + (cmd.indexOf("\n") !== -1 ? 's' : '') + '<br>' + utils.quote_san(cmd).replace('\n','<br>');
					} else {
						cmd = "/timeout " + user + " " + btn;
						tip = "Timeout User (" + utils.duration_string(btn) + ")";
					}
					output += '<a class="mod-icon html-tooltip' + (cmd.substr(0,9) === '/timeout' ? ' is-timeout' : '') + ' custom" data-cmd="' + utils.quote_attr(cmd) + '" title="' + tip + '" href="#">' + prefix + '</a>';
				}
			}

			return output + '</span>';
		},

		buildFromHTML: function(is_recipient) {
			var username = this.get(is_recipient ? 'msgObject.to' : 'msgObject.from'),
				raw_display = this.get(is_recipient ? 'msgObject.tags.recipient-display-name' : 'msgObject.tags.display-name'),
				alias = f.aliases[username],

				raw_color = this.get(is_recipient ? 'msgObject.toColor' : 'msgObject.color'),

				is_dark = (Layout && Layout.get('isTheatreMode')) || (is_replay ? f.settings.dark_twitch : (Settings && Settings.get('darkMode'))),
				is_replay = this.get('ffz_is_replay'),

				colors = raw_color && f._handle_color(raw_color),
				style = colors ? 'color:' + (is_dark ? colors[1] : colors[0]) : '',
				colored = colors ? ' has-color' + (is_replay ? ' replay-color' : '') : '',

				results = f.format_display_name(raw_display, username);

			return '<span class="' + (is_recipient ? 'to' : 'from') + (alias ? ' ffz-alias' : '') + (results[1] ? ' html-tooltip' : '') + colored + '" style="' + style + (colors ? '" data-color="' + raw_color : '') + (results[1] ? '" title="' + utils.quote_attr(results[1]) : '') + '">' + results[0] + '</span>';
		},

		buildSenderHTML: function() {
			var system_msg = this.get('systemMsg'),
				output = '';

			output = '<div class="indicator"></div>';

			// System Message
			if ( system_msg ) {
				output += '<div class="system-msg">' + utils.sanitize(system_msg) + '</div>';
				if ( this.get('ffzShouldRenderMessageBody') === false )
					return output;
			}

			// Timestamp
			var timestamp = this.get('timestamp');
			if ( timestamp )
				output += '<span class="timestamp">' + timestamp + '</span> ';

			// Moderator Actions
			output += this.buildModIconsHTML();

			// Badges
			output += '<span class="badges">' + f.render_badges(f.get_line_badges(this.get('msgObject'))) + '</span>';

			// From!
			output += this.buildFromHTML();

			if ( this.get('msgObject.to') ) {
				output += "<svg class='svg-whisper-arrow' height='10px' version='1.1' width='16px'><polyline points='6 2, 10 6, 6 10, 6 2' /></svg>";
				output += this.buildFromHTML(true);
			}

			return output + '<span class="colon">:</span> ';
		},

		buildDeletedMessageHTML: function() {
			return '<span class="deleted"><a class="undelete" href=#">&lt;message deleted&gt;</a></span>';
		},

		buildMessageHTML: function() {
			var output,
				recipient = this.get('msgObject.to'),
				is_whisper = recipient && recipient.length;

			if ( this.get('msgObject.style') === 'action' ) {
				var raw_color = this.get('msgObject.color'),
					colors = raw_color && f._handle_color(raw_color),
					is_replay = this.get('ffz_is_replay'),
					is_dark = (Layout && Layout.get('isTheatreMode')) || (is_replay ? f.settings.dark_twitch : (Settings && Settings.get('darkMode')));

				if ( raw_color )
					output = '<span class="message has-color' + (is_replay ? ' replay-color' : '') + '" style="color:' + (is_dark ? colors[1] : colors[0]) + '" data-color="' + raw_color + '">';
				else
					output = '<span class="message">';
			} else
				output = '<span class="message">';

			var body = f.render_tokens(this.get('ffzTokenizedMessage'), true, is_whisper && f.settings.filter_whispered_links && this.get("ffzUserLevel") < 4, this.get('isBitsEnabled'));
			if ( this.get('msgObject.ffz_line_returns') )
				body = body.replace(/\n/g, '<br>');

			output += body;

			var old_messages = this.get('msgObject.ffz_old_messages');
			if ( old_messages && old_messages.length )
				output += '<div class="button primary float-right ffz-old-messages">Show ' + utils.number_commas(old_messages.length) + ' Old</div>';

			return output + '</span>';
		},

		ffzRender: function() {
			var el = this.get('element'),
				output = this.buildSenderHTML();

			// If this is a whisper, or if we should render the message body, render it.
			if ( this.get('ffzShouldRenderMessageBody') !== false )
				if ( this.get('msgObject.deleted') )
					output += this.buildDeletedMessageHTML()
				else
					output += this.buildMessageHTML();

			el.innerHTML = output;
		},

		ffzShouldRenderMessageBody: function() {
			return ! this.get('hasSystemMsg') || this.get('hasMessageBody');
		}.property('hasSystemMsg', 'hasMessageBody'),

		//shouldRenderMessageBody: function() {
		//	return false;
		//}.property('hasSystemMsg', 'hasMessageBody'),

		ffzWasDeleted: function() {
			return f.settings.prevent_clear && this.get("msgObject.ffz_deleted")
		}.property("msgObject.ffz_deleted"),

		ffzHasOldMessages: function() {
			var old_messages = this.get("msgObject.ffz_old_messages");
			return old_messages && old_messages.length;
		}.property("msgObject.ffz_old_messages")
	});
}


FFZ.prototype._modify_chat_subline = function(component) {
	var f = this;

	this._modify_chat_line(component);

	component.reopen({
		classNameBindings: ["msgObject.style", "msgObject.isModerationMessage:moderation-message", "msgObject.ffz_has_mention:ffz-mentioned", "ffzWasDeleted:ffz-deleted", "ffzHasOldMessages:clearfix", "ffzHasOldMessages:ffz-has-deleted"],
		attributeBindings: ["msgObject.tags.id:data-id", "msgObject.room:data-room", "msgObject.from:data-sender", "msgObject.deleted:data-deleted"],

		didInsertElement: function() {
			this.set('msgObject._line', this);
			this.ffzRender();
		},

		willClearRender: function() {
			this.set('msgObject._line', null);
		},

		//didUpdate: function() { this.ffzRender(); },

		ffzBuildModMenu: function(el) {
			var t = this,
				setting = f.settings.mod_button_context,
				cl = el.classList,
				from = this.get("msgObject.from"),
				cmd = el.getAttribute('data-cmd'),
				trail = '';

			if ( ! cmd && cl.contains('ban') )
				cmd = "/ban " + from;
			else if ( ! cmd && cl.contains('timeout') )
				cmd = "/timeout " + from + " 600";
			else if ( ! cmd || cl.contains('unban') )
				return; // We can't send mod reasons for unbans and we need a command.
			else {
				var lines = cmd.split("\n"),
					first_line = lines.shift(),
					trail = lines.length ? "\n" + lines.join("\n") : "",
					match = BAN_SPLIT.exec(first_line);

				// If the line didn't match this, it's invalid.
				if ( ! match )
					return;

				cmd = match[1] ? "/ban " + match[1] : "/timeout " + match[2] + " " + (match[3] || "600");
				if ( match[4] )
					trail = match[4] + trail;
			}

			var bl = utils.createElement('ul', 'balloon__list'),
				balloon = utils.createElement('div', 'balloon balloon--dropmenu ffz-mod-balloon', bl),
				bc = utils.createElement('div', 'balloon-wrapper', balloon),
				has_items = false,

				is_ban = cmd.substr(1, 4) === 'ban ',
				title = utils.createElement('li', 'ffz-title');

			title.textContent = (is_ban ? 'Ban ' : 'Timeout ') + from + ' for...';
			bl.appendChild(title);
			bl.appendChild(utils.createElement('li', 'balloon__stroke'));

			var btn_click = function(reason, e) {
				if ( e.button !== 0 )
					return;

				var room_id = t.get('msgObject.room'),
					room = room_id && f.rooms[room_id] && f.rooms[room_id].room;

				if ( room ) {
					cmd = cmd + ' ' + reason + (trail ? (trail[0] === '\n' ? '' : ' ') + trail : '');
					var lines = cmd.split("\n");
					for(var i=0; i < lines.length; i++)
						room.send(lines[i], true);

					if ( cl.contains('is-timeout') )
						room.clearMessages(from, null, true);
				}

				f.close_popup();
				e.stopImmediatePropagation();
				e.preventDefault();
				return false;
			};

			if ( setting & 1 )
				for(var i=0; i < f.settings.mod_card_reasons.length; i++) {
					var btn = utils.createElement('div', 'balloon__link ellipsis'),
						line = utils.createElement('li', '', btn),
						reason = f.settings.mod_card_reasons[i];

					btn.textContent = btn.title = reason;
					btn.addEventListener('click', btn_click.bind(btn, reason));
					bl.appendChild(line);
					has_items = true;
				}

			if ( setting & 2 ) {
				var room_id = t.get('msgObject.room'),
					room = room_id && f.rooms[room_id] && f.rooms[room_id].room,
					rules = room && room.get('roomProperties.chat_rules');

				if ( rules && rules.length ) {
					if ( has_items )
						bl.appendChild(utils.createElement('li', 'balloon__stroke'));

					for(var i=0; i < rules.length; i++) {
						var btn = utils.createElement('div', 'balloon__link ellipsis'),
							line = utils.createElement('li', '', btn),
							reason = rules[i];

						btn.textContent = btn.title = reason;
						btn.addEventListener('click', btn_click.bind(btn, reason));
						bl.appendChild(line);
						has_items = true;
					}
				}
			}

			if ( ! has_items )
				return false;

			var rect = el.getBoundingClientRect(),
				is_bottom = rect.top > (window.innerHeight / 2),
				position = [rect.left, (is_bottom ? rect.top : rect.bottom)];

			balloon.classList.add('balloon--' + (is_bottom ? 'up' : 'down'));

			f.show_popup(bc, position, utils.find_parent(this.get('element'), 'chat-messages'));
			return true;
		},

		contextMenu: function(e) {
			if ( ! e.target )
				return;

			var cl = e.target.classList,
				from = this.get("msgObject.from"),
				abort = false;

			// We only want to show a context menu for mod icons right now.
			if ( cl.contains('mod-icon') )
				abort |= this.ffzBuildModMenu(e.target);

			if ( abort ) {
				e.stopImmediatePropagation();
				e.preventDefault();
			}
		},

		click: function(e) {
			if ( ! e.target )
				return;

			var cl = e.target.classList,
				from = this.get("msgObject.from");

			if ( cl.contains('ffz-old-messages') )
				return f._show_deleted(this.get('msgObject.room'));

			else if ( cl.contains('deleted-word') ) {
				jQuery(e.target).trigger('mouseout');
				e.target.outerHTML = e.target.getAttribute('data-text');

			} else if ( cl.contains('deleted-link') )
				return f._deleted_link_click.call(e.target, e);

			else if ( cl.contains('mod-icon') ) {
				jQuery(e.target).trigger('mouseout');
				e.preventDefault();

				if ( cl.contains('ban') )
					this.sendAction("banUser", {user:from});

				else if ( cl.contains('unban') )
					this.sendAction("unbanUser", {user:from});

				else if ( cl.contains('timeout') )
					this.sendAction("timeoutUser", {user:from});

				else if ( cl.contains('custom')  ) {
					var room_id = this.get('msgObject.room'),
						room = room_id && f.rooms[room_id] && f.rooms[room_id].room,
						cmd = e.target.getAttribute('data-cmd');

					if ( room ) {
						var lines = cmd.split("\n");
						for(var i=0; i < lines.length; i++)
							room.send(lines[i], true);

						if ( cl.contains('is-timeout') )
							room.clearMessages(from, null, true);
					}
					return;

				}

			} else if ( cl.contains('badge') ) {
				if ( cl.contains('click_url') )
					window.open(e.target.getAttribute('data-url'), "_blank");

				else if ( cl.contains('turbo') )
					window.open("/products/turbo?ref=chat_badge", "_blank");

				else if ( cl.contains('subscriber') )
					this.sendAction("clickSubscriber");

			} else if ( f._click_emote(e.target, e) )
				return;

			else if ( e.target.classList.contains('from') || e.target.parentElement.classList.contains('from') ) {
				var n = this.get('element'),
					bounds = n && n.getBoundingClientRect() || document.body.getBoundingClientRect(),
					x = 0, right;

				if ( bounds.left > 400 )
					right = bounds.left - 40;

				this.sendAction("showModOverlay", {
					left: bounds.left,
					right: right,
					top: bounds.top + bounds.height,
					real_top: bounds.top,
					sender: from
				});

			} else if ( e.target.classList.contains('to') || e.target.parentElement.classList.contains('to') ) {
				var n = this.get('element'),
					bounds = n && n.getBoundingClientRect() || document.body.getBoundingClientRect(),
					x = 0, right;

				if ( bounds.left > 400 )
					right = bounds.left - 40;

				this.sendAction("showModOverlay", {
					left: bounds.left,
					right: right,
					top: bounds.top + bounds.height,
					real_top: bounds.top,
					sender: this.get('msgObject.to')
				});

			} else if ( e.target.classList.contains('undelete') ) {
				e.preventDefault();
				this.set("msgObject.deleted", false);
			}
		}
	});

	try {
		component.create().destroy()
	} catch(err) { }
}


FFZ.prototype._modify_vod_line = function(component) {
	var f = this;
	// We need to override a few things.
	this._modify_chat_line(component, true);

	component.reopen({
		ffz_is_replay: true,

		/*lineChanged: Ember.observer("msgObject.deleted", "isModeratorOrHigher", function() {
			this.$(".mod-icons").replaceWith(this.buildModIconsHTML());
			if ( this.get("msgObject.deleted") )
				this.$(".message").replaceWith(this.buildMessageHTML());
			else
				this.$(".deleted").replaceWith(this.buildMessageHTML());
		}),*/

		classNameBindings: ["msgObject.ffz_has_mention:ffz-mentioned"],
		attributeBindings: ["msgObject.room:data-room", "msgObject.from:data-sender", "msgObject.deleted:data-deleted"],

		tokenizedMessage: function() {
			return [];
		}.property('msgObject.message'),

		ffzTokenizedMessage: function() {
			try {
				return f.tokenize_vod_line(this.get('msgObject'), !(this.get('enableLinkification') || this.get('isModeratorOrHigher')));
			} catch(err) {
				f.error("vod-chat-line tokenizedMessage: " + err);
				return this._super();
			}
		}.property("msgObject.message", "currentUserNick", "msgObject.from", "msgObject.tags.emotes"),

		buildHorizontalLineHTML: function() {
			return '<div class="horizontal-line"><span>' + this.get('msgObject.timestamp') + '</span></div>';
		},

		buildModIconsHTML: function() {
			if ( ! this.get("isViewerModeratorOrHigher") || this.get("isModeratorOrHigher") )
				return "";

			return '<span class="mod-icons">' +
				(this.get('msgObject.deleted') ?
					'<em class="mod-icon unban"></em>' :
					'<a class="mod-icon html-tooltip delete" title="Delete Message" href="#">Delete</a>') + '</span>';
		},

		buildDeletedMesageHTML: function() {
			return '<span clas="deleted">&lt;message deleted&gt;</span>';
		},

		//didUpdate: function() { this.ffzRender() },
		didInsertElement: function() { this.ffzRender() },

		ffzRender: function() {
			var el = this.get('element'), output;

			if ( this.get('msgObject.isHorizontalLine') )
				output = this.buildHorizontalLineHTML();
			else {
				output = this.buildSenderHTML();
				if ( this.get('msgObject.deleted') )
					output += this.buildDeletedMessageHTML()
				else
					output += this.buildMessageHTML();
			}

			el.innerHTML = output;
		},

		click: function(e) {
			var cl = e.target.classList;

			if ( cl.contains('badge') ) {
				if ( cl.contains('click_url') )
					window.open(e.target.getAttribute('data-url'), "_blank");

				else if ( cl.contains('turbo') )
					window.open("/products/turbo?ref=chat_badge", "_blank");

				else if ( cl.contains('subscriber') )
					this.sendAction("clickSubscriber");

			} else if ( cl.contains('delete') ) {
				e.preventDefault();
				this.sendAction("timeoutUser", this.get("msgObject.id"));
			}
		}
	});

	try {
		component.create().destroy()
	} catch(err) { }
}


// ---------------------
// Capitalization
// ---------------------

FFZ.capitalization = {};
FFZ._cap_fetching = 0;
FFZ._cap_waiting = {};

FFZ.get_capitalization = function(name, callback) {
	if ( ! name )
		return name;

	name = name.toLowerCase();
	if ( name == "jtv" || name == "twitchnotify" )
		return name;

	var old_data = FFZ.capitalization[name];
	if ( old_data ) {
		if ( Date.now() - old_data[1] < 3600000 )
			return old_data[0];
	}

	if ( FFZ._cap_waiting[name] )
		FFZ._cap_waiting[name].push(callback);

	else if ( FFZ._cap_fetching < 25 ) {
		FFZ._cap_fetching++;
		FFZ._cap_waiting[name] = [callback];

		FFZ.get().ws_send("get_display_name", name, function(success, data) {
			var cap_name = success ? data : name,
				waiting = FFZ._cap_waiting[name];

			FFZ.capitalization[name] = [cap_name, Date.now()];
			FFZ._cap_fetching--;
			FFZ._cap_waiting[name] = false;

			for(var i=0; i < waiting.length; i++)
				try {
					typeof waiting[i] === "function" && waiting[i](cap_name);
				} catch(err) { }
		});
	}

	return old_data ? old_data[0] : name;
}


// ---------------------
// Banned Words
// ---------------------

FFZ.prototype._remove_banned = function(tokens) {
	var banned_words = this.settings.banned_words;
	if ( ! banned_words || ! banned_words.length )
		return tokens;

	if ( typeof tokens == "string" )
		tokens = [tokens];

	var regex = FFZ._words_to_regex(banned_words),
		new_tokens = [];

	for(var i=0, l = tokens.length; i < l; i++) {
		var token = tokens[i];
		if ( typeof token === "string" )
			token = {type: "text", text: token};

		if ( token.type === "text" && regex.test(token.text) ) {
			token = token.text.replace(regex, function(all, prefix, match) {
				if ( prefix.length )
					new_tokens.push({type: "text", text: prefix});
				new_tokens.push({
					type: "deleted",
					length: match.length,
					text: match
				});

				return "";
			});

			if ( token )
				new_tokens.push({type: "text", text: token});

		} else if ( token.type === "emoticon" && regex.test(token.altText) ) {
			token = token.altText.replace(regex, function(all, prefix, match) {
				if ( prefix.length )
					new_tokens.push({type: "text", text: prefix});
				new_tokens.push({
					type: "deleted",
					length: match.length,
					text: match
				});

				return "";
			});

			if ( token )
				new_tokens.push({type: "text", text: token});

		} else if ( token.type === "link" && regex.test(token.text) )
			new_tokens.push({
				type: "link",
				isDeleted: true,
				isMailTo: token.isMailTo,
				isLong: false,
				length: token.text.length,
				censoredLink: token.text.replace(regex, "$1***"),
				link: token.link,
				text: token.text
			});

		else
			new_tokens.push(token);
	}

	return new_tokens;
}


// ---------------------
// Emoticon Replacement
// ---------------------

FFZ.prototype._emoticonize = function(component, tokens) {
	var room_id = component.get("msgObject.room"),
		user_id = component.get("msgObject.from");

	return this.tokenize_emotes(user_id, room_id, tokens);
}