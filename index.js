/* globals powercord */
const { Plugin } = require("powercord/entities");
const { React, getModule, getAllModules, getModuleByDisplayName } = require('powercord/webpack');
const { forceUpdateElement, getOwnerInstance } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');
const Badges = require("./Badges");
const { join } = require('path');
const { loadStyle, unloadStyle } = require('./util');
const cache = { _guilds: {} };

const badgeData = require('./userBadgeData.json')

module.exports = class CustomBadges extends Plugin {
  async startPlugin() {
    const styleId = loadStyle(join(__dirname, 'style.css'));
    await this.injectUsers();
    await this.injectGuilds();
  }

  
  getBadges(id) {

    const userBadgeData = badgeData[id];

    if(!userBadgeData) {
      delete cache[id];
      return {};
    }

    return userBadgeData.badges;
  }

  async injectUsers() {
    const UserProfileBadgeList = getAllModules(
      (m) => m.default?.displayName === "UserProfileBadgeList"
    )[1];

    inject(
      "pc-badges-forked-users",
      UserProfileBadgeList,
      "default",
      ([props], res) => {
        const [badges, setBadges] = React.useState(null);
        React.useEffect(() => {
          if(!cache[props.user.id]) {
            const receivedBadges = this.getBadges(props.user.id)
            cache[props.user.id] = receivedBadges;
          }

          setBadges(cache[props.user.id], function() {});
        }, []);

        if (!badges) {
          return res;
        }

        const render = (Component, key, props = {}) => (React.createElement(Component, {
			  key: `pc-${key}`,
			  color: badges.custom && badges.custom.color,
			  ...props
			})
		);


        if (badges.custom && badges.custom.name && badges.custom.icon) {
          res.props.children.push(
            render(Badges.Custom, "cutie", badges.custom)
          );
        }
        if (badges.developer) {
          res.props.children.push(render(Badges.Developer, "developer"));
        }
        if (badges.staff) {
          res.props.children.push(render(Badges.Staff, "staff"));
        }
        if (badges.support) {
          res.props.children.push(render(Badges.Support, "support"));
        }
        if (badges.contributor) {
          res.props.children.push(render(Badges.Contributor, "contributor"));
        }
        if (badges.translator) {
          res.props.children.push(render(Badges.Translator, "translator"));
        }
        if (badges.hunter) {
          res.props.children.push(render(Badges.BugHunter, "hunter"));
        }
        if (badges.early) {
          res.props.children.push(render(Badges.EarlyUser, "early"));
        }

        return res;
      }
    );

    UserProfileBadgeList.default.displayName = "UserProfileBadgeList";
  }

  async injectGuilds () {
	const GuildHeader = await getModule([ 'AnimatedBanner', 'default' ]);
	const GuildBadge = await getModuleByDisplayName('GuildBadge');
  
	inject('pc-badges-guilds-forked-header', GuildHeader.default, 'type', ([ props ], res) => {
	  if (cache._guilds[props.guild.id]) {
		res.props.children[0].props.children[0].props.children[0].props.children.unshift(
		  React.createElement(Badges.Custom, {
			...cache._guilds[props.guild.id],
			tooltipPosition: 'bottom',
			gap: false
		  })
		);
	  }
	  return res;
	});
  
	inject('pc-badges-guilds-forked-tooltip', GuildBadge.prototype, 'render', function (_, res) {
	  if (this.props.size && cache._guilds[this.props.guild.id]) {
		return [
		  React.createElement(Badges.Custom, {
			...cache._guilds[this.props.guild.id],
			tooltipPosition: 'bottom'
		  }),
		  res
		];
	  }
	  return res;
	});
  

	cache._guilds = {
		"1014837057333497917": {
			"name":"Kietas esi",
			"icon":"https://cdn.discordapp.com/emojis/1022884736550584450.gif?size=96&quality=lossless"
		}
	}
  }

  pluginWillUnload() {
    unloadStyle(styleId);
    uninject('pc-badges-users-forked-render');
    uninject('pc-badges-users-forked-update');
    uninject('pc-badges-users-forked-fetch');
    uninject('pc-badges-guilds-forked-header');
    uninject('pc-badges-guilds-forked-tooltip');

    const containerClasses = getModule([ 'subscribeTooltipText' ], false);
    const modalClasses = getModule([ 'topSectionNormal' ], false);
    if (containerClasses) {
      forceUpdateElement(`.${containerClasses.container}`);
    }
    if (modalClasses) {
      const modalHeader = document.querySelector(`.${modalClasses.topSectionNormal} header`);
      if (modalHeader) {
        const instance = getOwnerInstance(modalHeader);
        (instance._reactInternals || instance._reactInternalFiber).return.stateNode.forceUpdate();
      }
    }
  }
};
