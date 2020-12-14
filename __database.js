// contains a list of useful mappings to help things

module.exports = {
  Rarity: {
    matches: {
      Author: "Allara",
      Title: "Rarity",
      Notes: "Tracks rare drops, including companions and mounts",
      SavedVariables: "RarityDB",
    },
    gives: {
      curse: "rarity",
    },
  },
  WorldQuestsList: {
    matches: {
      Title: "World Quests List",
      Author: "ykiigor",
      SavedVariables: "VWQL",
    },
    gives: {
      curse: "world-quests-list",
    },
  },
  TradeSkillMaster_AppHelper: {
    matches: {
      Title: "|cff00ff00TradeSkillMaster_AppHelper|r",
      Notes: "Acts as a connection between the TSM addon and app.",
      Author: "TSM Team",
      SavedVariables: "TradeSkillMaster_AppHelperDB",
      Dependency: "TradeSkillMaster",
    },
    gives: {
      tsm: true,
    },
  },
  TradeSkillMaster: {
    matches: {
      Title: "|cff00fe00TradeSkillMaster|r",
      Notes: "Auction house and gold making addon.",
      Author: "TradeSkillMaster Team",
      SavedVariables: "TradeSkillMasterDB, TSMItemInfoDB",
    },
    gives: {
      tsm: true,
    },
  },
  Plater: {
    matches: {
      Title: "Plater",
      Notes: "Nameplate addon designed for advanced users.",
      SavedVariables: "PlaterDB",
      SavedVariablesPerCharacter: "PlaterDBChr",
    },
    gives: {
      curse: "plater-nameplates",
    },
  },
  Pawn: {
    matches: {
      Title: "Pawn",
      Notes: "Pawn helps you compare items and find upgrades.",
      SavedVariables: "PawnCommon",
      SavedVariablesPerCharacter: "PawnOptions, PawnMrRobotScaleProviderOptions, PawnClassicScaleProviderOptions",
    },
    gives: {
      curse: "pawn",
    },
  },

  TheUndermineJournal: {
    matches: {
      Title: "The Undermine Journal",
      OptionalDeps: "Auctionator, AuctionLite, LibExtraTip",
      SavedVariablesPerCharacter: "TUJTooltipsHidden, TUJTooltipsSettings",
    },
    gives: {
      curse: "undermine-journal",
    },
  },
  ElvUI_SLE: {
    matches: {
      Title: "|cff1784d1ElvUI|r |cff9482c9Shadow & Light|r",
      Author: "Darth Predator, Repooc",
      Notes: "Plugin-edit for |cff1784d1ElvUI|r adding additional features.",
      RequiredDeps: "ElvUI",
      SavedVariables: "SLE_ArmoryDB",
    },
    gives: {
      tukui: 38,
    },
  },
  ElvUI_Redtuzk: {
    matches: {
      Author: "Redtuzk",
      Title: "|cff1784d1ElvUI|r |cffc41f3bRedtuzk|r",
      Notes: "Contains profile layouts designed by Redtuzk",
      RequiredDeps: "ElvUI",
      "X-Tukui-ProjectID": "107",
    },
    gives: {
      tukui: 107,
    },
  },
  ElvUI_FCT: {
    matches: {
      Author: "Simpy, Lightspark",
      Title: "|cff1784d1ElvUI|r |cFFdd2244Floating Combat Text|r",
      SavedVariables: "ElvFCT",
      RequiredDeps: "ElvUI",
    },
    gives: {
      tukui: 137,
    },
  },
  ElvUI: {
    matches: {
      Author: "Elv, Simpy",
      Title: "|cff1784d1ElvUI|r",
      Notes: "User Interface replacement AddOn for World of Warcraft.",
      SavedVariables: "ElvDB, ElvPrivateDB",
      SavedVariablesPerCharacter: "ElvCharacterDB",
      "X-Tukui-ProjectID": "-2",
    },
    gives: {
      tukui: -2,
    },
  },
  Details: {
    matches: {
      Title: "Details! Damage Meter",
      Notes: "Essential tool to impress that chick in your raid.",
      SavedVariables: "_detalhes_global",
      SavedVariablesPerCharacter: "_detalhes_database",
    },
    gives: {
      curse: "details",
    },
  },
  AddOnSkins: {
    matches: {
      Title: "|cff16C3F2AddOn|r|cFFFFFFFFSkins|r",
      Author: "Azilroka, NihilisticPandemonium",
      SavedVariables: "AddOnSkinsDB, AddOnSkinsDS",
    },
    gives: {
      tukui: 3,
    },
  },
  Tukui: {
    matches: {
      Author: 'Tukz',
      Title: '|cffff8000Tukui|r',
      Notes: 'UI of awesomeness!',
    },
    gives: {
      tukui: -1,
    },
  }
};
