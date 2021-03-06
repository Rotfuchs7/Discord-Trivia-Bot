const pjson = require("./package.json");

// The spacing of the artwork will mess up with double-digit version numbers (such as '1.10.0')
// process.stdout.columns returns "undefined" in certain situations
if(process.stdout.columns > 61) {
  console.log("                 ########\n            ##################\n         ###      #######     ###\n       ###    ###############   ###\n     ###    ####################  ###\n    ###     #########    ########  ###\n   ###     ########      ########   ###\n  ###       #####       ########     ###\n ###                  ##########      ### \x1b[7m TriviaBot Version " + pjson.version + "   \x1b[0m\n ###               ###########        ### \x1b[7m Copyright (c) 2018 Lake Y \x1b[0m\n ###              #########           ### \x1b[7m http://lakeys.net         \x1b[0m\n  ###             ########           ###\n   ###            ######            ###\n    ###            ####            ###\n      ###         ######         ###\n        ###      #######       ###\n          #####    ####    #####\n               ############\n                  ######");
}
else {
  console.log("                 ########\n            ##################\n         ###      #######     ###\n       ###    ###############   ###\n     ###    ####################  ###\n    ###     #########    ########  ###\n   ###     ########      ########   ###\n  ###       #####       ########     ###\n ###                  ##########      ###\n ###               ###########        ###\n ###              #########           ###\n  ###             ########           ###\n   ###            ######            ###\n    ###            ####            ###\n      ###         ######         ###\n        ###      #######       ###\n          #####    ####    #####\n               ############\n                  ######\n\x1b[7m TriviaBot Version " + pjson.version + "   \x1b[0m\n\x1b[7m Copyright (c) 2018 Lake Y \x1b[0m\n\x1b[7m http://lakeys.net         \x1b[0m");
}

process.title = "TriviaBot " + pjson.version;

// # Initialize Config Args # //
for(var i = 0; i <= process.argv.length; i++) {
  if(typeof process.argv[i] !== "undefined" && process.argv[i].startsWith("--configfile=")) {
    var configFile = process.argv[i].replace("--configfile=", "");
  }
}

var config = require("./lib/config.js")(configFile, true);
require("./lib/init.js")(pjson,config);

// # Requirements/Init # //
process.stdin.resume();
process.stdin.setEncoding("utf8");
const fs = require("fs");

// # Discord # //
const { ShardingManager } = require("discord.js");
var token = config.token;
const manager = new ShardingManager(`${__dirname}/shard.js`, { totalShards: config["shard-count"], token, shardArgs: [configFile] });

// # Stats # //
var stats;
try {
  stats = JSON.parse(fs.readFileSync(config["stat-file"]));
} catch(error) {
  if(typeof error.code !== "undefined" && error.code === "ENOENT") {
    console.warn("No stats file found; one will be created.");
  }
  else {
    // If an error occurs, don't overwrite the old stats.
    config["stat-file"] = config["stat-file"] + ".1";
    stats = {};
    console.log("Failed to load stats file, stats will be saved to " + config["stat-file"] + ". Received error:\n" + error);
  }
}

// # ShardingManager # //
manager.spawn()
.catch((err) => {
  var warning = "";

  if(err.message.includes("401 Unauthorized")) {
    warning += "\nPlease double-check your token and try again.";
  }

  console.error("Discord client login failed - " + err + warning);

  process.exit();
});

manager.on("launch", (shard) => {
  console.log(`Successfully launched shard ${shard.id} of ${manager.totalShards-1}`);
});

// ## Manager Messages ## //
manager.on("message", (shard, input) => {
  if(typeof input.evalStr !== "undefined") {
    // Eval
    eval(input.evalStr);
  }
  else if(typeof input.stats !== "undefined") {
    // Update stats
    // Example: client.shard.send({stats: { test: 123 }});
    if(config["fallback-mode"] !== true) {
      Object.keys(input.stats).forEach((stat) => {
        if(typeof stats == "undefined") {
          stats = {};
        }

        if(typeof stats[stat] !== "number") {
          // This stat doesn't exist, initialize it.
          stats[stat] = input.stats[stat];
        }
        else {
          // Increase the stat
          stats[stat] += input.stats[stat];
        }

        fs.writeFile(config["stat-file"], JSON.stringify(stats, null, "\t"), "utf8", (err) => {
          if(err) {
            console.error("Failed to save stats.json with the following err:\n" + err + "\nMake sure stats.json is not read-only or missing.");
          }
        });
      });
    }
  }
});

// # Console Functions # //
process.stdin.on("data", (text) => {
  if(text.toString() === "stop\r\n" || text.toString() === "exit\r\n" || text.toString() === "stop\n" || text.toString() === "exit\n") {
    manager.broadcastEval("client.destroy();")
    .then(() => {
      process.exit();
    });
  }
  else {
    console.log("Eval on index:");
    try {
      eval(text.toString());
    }
    catch(err) {
      console.log(err);
    }
  }
});
