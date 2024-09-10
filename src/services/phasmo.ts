// import { createCanvas, loadImage } from "canvas";
import path from "path";
import Canvas, { GlobalFonts } from "@napi-rs/canvas";
import { User } from "discord.js";

GlobalFonts.registerFromPath(path.join(process.cwd(), "fonts", "Poppins-Medium.ttf"), "Poppins");

type SettingDifficultyType = "veryeasy" | "easy" | "normal" | "hard" | "veryhard" | "impossible";

interface MapInfo {
  name: string;
  image: string;
  baseWeight: number;
  multiplier: number;
}

interface DifficultySettingChoice {
  value: string | number;
  baseWeight: number;
  multiplier: number;
  difficulty: SettingDifficultyType;
}

interface MapResult {
  name: string;
  image: string;
}

interface DifficultyResult {
  name: string;
  value: string | number;
  difficulty: SettingDifficultyType;
}

interface RollResult {
  map: MapResult;
  playerSettings: DifficultyResult[];
  ghostSettings: DifficultyResult[];
  contractSettings: DifficultyResult[];
  probability: number;
}

class DifficultySetting {
  name: string;

  choices: DifficultySettingChoice[] = [];

  totalWeight: number = 0;

  public addChoice(choice: DifficultySettingChoice) {
    this.choices.push(choice);

    this.totalWeight += choice.baseWeight * choice.multiplier;

    return this;
  }

  constructor(name: string) {
    this.name = name;
  }
}

class PhasmoRandomizer {
  static maps: MapInfo[] = [];

  static playerSettings: DifficultySetting[] = [];
  static ghostSettings: DifficultySetting[] = [];
  static contractSettings: DifficultySetting[] = [];

  public static addMap(map: MapInfo) {
    PhasmoRandomizer.maps.push(map);
  }

  public static addPlayerSetting(setting: DifficultySetting) {
    PhasmoRandomizer.playerSettings.push(setting);
  }

  public static addGhostSetting(setting: DifficultySetting) {
    PhasmoRandomizer.ghostSettings.push(setting);
  }

  public static addContractSetting(setting: DifficultySetting) {
    PhasmoRandomizer.contractSettings.push(setting);
  }

  protected static rollMap() {
    let totalWeight = 0;

    for (let map of this.maps) {
      totalWeight += map.baseWeight * map.multiplier;
    }

    let random = Math.random() * totalWeight;

    for (let map of this.maps) {
      if (random < map.baseWeight * map.multiplier) {
        return { choice: map, weight: map.baseWeight * map.multiplier, totalWeight };
      }

      random -= map.baseWeight * map.multiplier;
    }

    return null;
  }

  protected static rollSetting(setting: DifficultySetting) {
    let totalWeight = 0;

    for (let choice of setting.choices) {
      totalWeight += choice.baseWeight * choice.multiplier;
    }

    let random = Math.random() * totalWeight;

    for (let choice of setting.choices) {
      if (random < choice.baseWeight * choice.multiplier) {
        return { choice: choice, weight: choice.baseWeight * choice.multiplier, totalWeight };
      }

      random -= choice.baseWeight * choice.multiplier;
    }

    return null;
  }

  public static roll() {
    let probability = 1;

    const pickMapInfo = this.rollMap();
    probability *= pickMapInfo!.weight / pickMapInfo!.totalWeight;

    const map = { name: pickMapInfo!.choice.name, image: pickMapInfo!.choice.image };

    // Roll the players settings
    const playerSettings: DifficultyResult[] = [];

    this.playerSettings.forEach((setting) => {
      const pickSetting = this.rollSetting(setting);

      probability *= pickSetting!.weight / pickSetting!.totalWeight;

      playerSettings.push({
        name: setting.name,
        value: pickSetting!.choice.value,
        difficulty: pickSetting!.choice.difficulty,
      });
    });
    // Roll the players settings
    const ghostSettings: DifficultyResult[] = [];

    this.ghostSettings.forEach((setting) => {
      const pickSetting = this.rollSetting(setting);

      probability *= pickSetting!.weight / pickSetting!.totalWeight;

      ghostSettings.push({
        name: setting.name,
        value: pickSetting!.choice.value,
        difficulty: pickSetting!.choice.difficulty,
      });
    });

    // Roll the players settings
    const contractSettings: DifficultyResult[] = [];

    this.contractSettings.forEach((setting) => {
      const pickSetting = this.rollSetting(setting);

      probability *= pickSetting!.weight / pickSetting!.totalWeight;

      contractSettings.push({
        name: setting.name,
        value: pickSetting!.choice.value,
        difficulty: pickSetting!.choice.difficulty,
      });
    });

    return {
      map,
      playerSettings,
      ghostSettings,
      contractSettings,
      probability,
    };
  }
}

const getSettingStringColor = (type: SettingDifficultyType) => {
  if (type == "impossible") {
    return "#c70039 ";
  } else if (type == "veryhard") {
    return "#ff5733";
  } else if (type == "hard") {
    return "#ffc300";
  } else if (type == "normal") {
    return "#ffffff";
  } else if (type == "easy") {
    return "#32c495";
  } else if (type == "veryeasy") {
    return "#32c44c";
  }

  return "#ffffff";
};

export const getRollImage = async (user: User) => {
  const canvas = Canvas.createCanvas(1000, 450);
  const context = canvas.getContext("2d");
  const randomSettings = PhasmoRandomizer.roll();

  const background = await Canvas.loadImage(
    path.join(process.cwd(), "images", randomSettings.map.image)
  );
  context.drawImage(background, 0, 0, canvas.width, canvas.height);
  context.strokeRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  context.fillRect(15, 60, 970, 380);

  context.font = "20px Poppins";
  context.fillStyle = "#ffffff";

  context.fillText("Player", 75, 100);

  let basePlayerSettingY = 150;
  randomSettings.playerSettings.forEach((setting) => {
    context.font = "14px Poppins";
    context.fillStyle = getSettingStringColor(setting.difficulty);

    context.fillText(setting.name, 25, basePlayerSettingY);
    context.fillText(`${setting.value}`, 230, basePlayerSettingY);

    basePlayerSettingY += 24;
  });

  context.font = "20px Poppins";
  context.fillStyle = "#ffffff";

  context.fillText("Ghost", 405, 100);

  let baseGhostSettingY = 150;
  randomSettings.ghostSettings.forEach((setting) => {
    context.font = "14px Poppins";

    context.fillStyle = getSettingStringColor(setting.difficulty);

    context.fillText(setting.name, 330, baseGhostSettingY);
    context.fillText(`${setting.value}`, 540, baseGhostSettingY);

    baseGhostSettingY += 24;
  });

  context.font = "20px Poppins";
  context.fillStyle = "#ffffff";

  context.fillText("Contract", 735, 100);

  let baseContractSettingY = 145;
  randomSettings.contractSettings.forEach((setting) => {
    context.font = "14px Poppins";
    context.fillStyle = getSettingStringColor(setting.difficulty);

    context.fillText(setting.name, 660, baseContractSettingY);
    context.fillText(`${setting.value}`, 890, baseContractSettingY);

    baseContractSettingY += 24;
  });

  context.font = "24px Poppins";
  context.fillStyle = "#ffffff";
  context.fillText(
    randomSettings.map.name,
    canvas.width - context.measureText(randomSettings.map.name).width - 25,
    30
  );

  // context.fillText(`P: ${randomSettings.probability.toFixed(16)} %`, 35, canvas.height - 35);

  const avatarSize = 32;
  const avatarX = 10;
  const avatarY = 10;

  context.font = "20px Poppins";
  context.fillStyle = "#ffffff";
  context.fillText(user.username, avatarX + avatarSize + 5, avatarY + 20);

  context.beginPath();
  context.arc(
    (avatarX * 2 + avatarSize) / 2,
    (avatarY * 2 + avatarSize) / 2,
    avatarSize / 2,
    0,
    Math.PI * 2,
    true
  );
  context.closePath();
  context.clip();

  const avatar = await Canvas.loadImage(user.displayAvatarURL());
  context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);

  return await canvas.encode("png");
};

// Data
PhasmoRandomizer.addMap({
  name: "6 Tanglewood Drive",
  image: "tanglewood.webp",
  baseWeight: 1,
  multiplier: 1,
});

PhasmoRandomizer.addMap({
  name: "10 Ridgeview Court",
  image: "ridgeview.webp",
  baseWeight: 1,
  multiplier: 1,
});

PhasmoRandomizer.addMap({
  name: "13 Willow Street",
  image: "willow.webp",
  baseWeight: 1,
  multiplier: 1,
});

PhasmoRandomizer.addMap({
  name: "42 Edgefield Road",
  image: "edgefield.webp",
  baseWeight: 1,
  multiplier: 1,
});

PhasmoRandomizer.addMap({
  name: "Bleasdale Farmhouse",
  image: "bleasdale.webp",
  baseWeight: 1,
  multiplier: 1,
});

PhasmoRandomizer.addMap({
  name: "Grafton Farmhouse",
  image: "grafton.webp",
  baseWeight: 1,
  multiplier: 1,
});

PhasmoRandomizer.addMap({
  name: "Sunny Meadows Mental Institution (Restricted)",
  image: "sunnymeadows.webp",
  baseWeight: 1,
  multiplier: 1,
});

// Player Settings
PhasmoRandomizer.addPlayerSetting(
  new DifficultySetting("Starting Sanity")
    .addChoice({ value: 0, baseWeight: 0.0215924, multiplier: 1, difficulty: "impossible" })
    .addChoice({ value: 25, baseWeight: 0.0631494, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 50, baseWeight: 0.149822, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: 75, baseWeight: 0.2917708, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: 100, baseWeight: 0.4736654, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addPlayerSetting(
  new DifficultySetting("Sanity pill restoration (%)")
    .addChoice({ value: 0, baseWeight: 0.030978, multiplier: 1, difficulty: "impossible" })
    .addChoice({ value: 5, baseWeight: 0.064453, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 10, baseWeight: 0.119834, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 20, baseWeight: 0.248575, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: 25, baseWeight: 0.304054, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: 30, baseWeight: 0.238261, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 35, baseWeight: 0.128263, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 40, baseWeight: 0.058684, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 45, baseWeight: 0.021781, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 50, baseWeight: 0.006625, multiplier: 1, difficulty: "veryeasy" })
    .addChoice({ value: 75, baseWeight: 0.000364, multiplier: 1, difficulty: "veryeasy" })
    .addChoice({ value: 100, baseWeight: 0.000008, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addPlayerSetting(
  new DifficultySetting("Sanity drain speed (%)")
    .addChoice({
      value: 0,
      baseWeight: 0.005,
      multiplier: 1,
      difficulty: "veryeasy",
    })
    .addChoice({ value: 50, baseWeight: 0.015, multiplier: 1, difficulty: "veryeasy" })
    .addChoice({ value: 100, baseWeight: 0.03, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 150, baseWeight: 0.05, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 200, baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addPlayerSetting(
  new DifficultySetting("Sprinting")
    .addChoice({
      value: "Off",
      baseWeight: 0.07,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: "On", baseWeight: 0.924, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: "Infinite", baseWeight: 0.006, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addPlayerSetting(
  new DifficultySetting("Player speed (%)")
    .addChoice({
      value: 50,
      baseWeight: 0.025,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: 75, baseWeight: 0.045, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 100, baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: 125, baseWeight: 0.02, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 150, baseWeight: 0.01, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addPlayerSetting(
  new DifficultySetting("Flashlights")
    .addChoice({
      value: "Off",
      baseWeight: 0.1,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: "On", baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
);

//// Ghosts
PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Ghost speed (%)")
    .addChoice({
      value: 150,
      baseWeight: 0.025,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: 125, baseWeight: 0.045, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 100, baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: 75, baseWeight: 0.02, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 50, baseWeight: 0.01, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Roaming frequency")
    .addChoice({
      value: "High",
      baseWeight: 0.9,
      multiplier: 1,
      difficulty: "normal",
    })
    .addChoice({ value: "Medium", baseWeight: 0.07, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "Low", baseWeight: 0.03, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Changing favourite room")
    .addChoice({
      value: "High",
      baseWeight: 0.06,
      multiplier: 1,
      difficulty: "veryhard",
    })
    .addChoice({ value: "Medium", baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: "Low", baseWeight: 0.03, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "None", baseWeight: 0.01, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Interaction amount")
    .addChoice({
      value: "High",
      baseWeight: 0.03,
      multiplier: 1,
      difficulty: "veryeasy",
    })
    .addChoice({ value: "Medium", baseWeight: 0.07, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "Low", baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Event frequency")
    .addChoice({
      value: "High",
      baseWeight: 0.9,
      multiplier: 1,
      difficulty: "normal",
    })
    .addChoice({ value: "Medium", baseWeight: 0.07, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "Low", baseWeight: 0.03, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Friendly ghost")
    .addChoice({
      value: "On",
      baseWeight: 0.005,
      multiplier: 1,
      difficulty: "veryeasy",
    })
    .addChoice({ value: "Low", baseWeight: 0.995, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Grace period (s)")
    .addChoice({
      value: 0,
      baseWeight: 0.02,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: 1, baseWeight: 0.1, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 2, baseWeight: 0.8, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: 3, baseWeight: 0.05, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 4, baseWeight: 0.02, multiplier: 1, difficulty: "veryeasy" })
    .addChoice({ value: 5, baseWeight: 0.01, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Hunt duration")
    .addChoice({
      value: "High",
      baseWeight: 0.9,
      multiplier: 1,
      difficulty: "normal",
    })
    .addChoice({ value: "Medium", baseWeight: 0.07, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "Low", baseWeight: 0.03, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Kills extend hunts (s)")
    .addChoice({
      value: "High",
      baseWeight: 0.02,
      multiplier: 1,
      difficulty: "veryhard",
    })
    .addChoice({ value: "Medium", baseWeight: 0.07, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: "Low", baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: "None", baseWeight: 0.01, multiplier: 1, difficulty: "easy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Evidence given")
    .addChoice({
      value: 0,
      baseWeight: 0.01,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: 1, baseWeight: 0.1, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 2, baseWeight: 0.88, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: 3, baseWeight: 0.01, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Fingerprint chance (%)")
    .addChoice({
      value: 25,
      baseWeight: 0.02,
      multiplier: 1,
      difficulty: "veryhard",
    })
    .addChoice({ value: 50, baseWeight: 0.03, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: 75, baseWeight: 0.05, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: 100, baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addGhostSetting(
  new DifficultySetting("Fingerprint duration (s)")
    .addChoice({
      value: 15,
      baseWeight: 0.01,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: 30, baseWeight: 0.02, multiplier: 1, difficulty: "veryhard" })
    .addChoice({ value: 60, baseWeight: 0.03, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: 90, baseWeight: 0.04, multiplier: 1, difficulty: "hard" })
    .addChoice({ value: 120, baseWeight: 0.8, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: 180, baseWeight: 0.0095, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "Unlimited", baseWeight: 0.005, multiplier: 1, difficulty: "veryeasy" })
);

// Contracts
PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Setup time (s)")
    .addChoice({
      value: 0,
      baseWeight: 0.8,
      multiplier: 1,
      difficulty: "normal",
    })
    .addChoice({ value: 30, baseWeight: 0.1, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 60, baseWeight: 0.05, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 120, baseWeight: 0.03, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: 180, baseWeight: 0.01, multiplier: 1, difficulty: "veryeasy" })
    .addChoice({ value: 240, baseWeight: 0.0075, multiplier: 1, difficulty: "veryeasy" })
    .addChoice({ value: 300, baseWeight: 0.0025, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Weather").addChoice({
    value: "Random",
    baseWeight: 1,
    multiplier: 1,
    difficulty: "normal",
  })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Doors starting open")
    .addChoice({
      value: "None",
      baseWeight: 0.015,
      multiplier: 1,
      difficulty: "veryeasy",
    })
    .addChoice({ value: "Low", baseWeight: 0.035, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "Medium", baseWeight: 0.05, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "High", baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Number of hiding places")
    .addChoice({
      value: "None",
      baseWeight: 0.1,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: "Low", baseWeight: 0.8, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: "Medium", baseWeight: 0.05, multiplier: 1, difficulty: "easy" })
    .addChoice({ value: "High", baseWeight: 0.03, multiplier: 1, difficulty: "veryeasy" })
    .addChoice({ value: "Very high", baseWeight: 0.02, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Sanity monitor")
    .addChoice({
      value: "On",
      baseWeight: 0.1,
      multiplier: 1,
      difficulty: "easy",
    })
    .addChoice({ value: "Off", baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Activity monitor")
    .addChoice({
      value: "On",
      baseWeight: 0.1,
      multiplier: 1,
      difficulty: "easy",
    })
    .addChoice({ value: "Off", baseWeight: 0.9, multiplier: 1, difficulty: "normal" })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Fuse Box at start of contract")
    .addChoice({
      value: "Broken",
      baseWeight: 0.05,
      multiplier: 1,
      difficulty: "impossible",
    })
    .addChoice({ value: "Off", baseWeight: 0.85, multiplier: 1, difficulty: "normal" })
    .addChoice({ value: "On", baseWeight: 0.1, multiplier: 1, difficulty: "veryeasy" })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Fuse box shown on map")
    .addChoice({
      value: "Off",
      baseWeight: 0.9,
      multiplier: 1,
      difficulty: "normal",
    })
    .addChoice({ value: "On", baseWeight: 0.1, multiplier: 1, difficulty: "easy" })
);

PhasmoRandomizer.addContractSetting(
  new DifficultySetting("Cursed Possessions quantity").addChoice({
    value: "1 Random",
    baseWeight: 1,
    multiplier: 1,
    difficulty: "normal",
  })
);
