/* ===== IH4: the story's words, chapter 1 — from the writers' room (story bible "Always Do", 8 Nov 2026) =====
   Made by game/tools/story_build.py from the scene file; edit the scene file and rebuild rather than this one.
   Each mission: brief (its card on the title screen), radio (the lines during play, by step), and three scenes,
   open / mid / close, played by 06o_story.js. Pictures: art/story/<img>.webp; until one exists, ph_<ph>.webp. */
const STORY_TEXT={
 "m1": {
  "brief": [
   "The Calloway farm. Crew 4 is digging FORGE’s old wrecks out of their own wheat.",
   "Meet Rook at the barn, then guard the dig. The Wraith is the only mech Crew 4 has."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Wraith, this is Rook. I’m parked by the barn. Walk on over."
    ],
    [
     "ROOK",
     "Left thumb walks, right thumb aims. Tap JET to hop, hold it to hover."
    ]
   ],
   "1": [
    [
     "DIG CREW",
     "Rook! Something just twitched in the wreck pile."
    ],
    [
     "ROOK",
     "Scrap doesn’t twitch. Wraith, get in the ring and hold."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Three masts. The marker shows the nearest. Keep firing till it falls."
    ],
    [
     "UNKNOWN",
     "Take your people home, Crew 4."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m1_open",
     "ph": "field",
     "lines": [
      [
       "",
       "2176. For fifty years FORGE’s war zones were fenced off. Now the fence is down, and the rush is on."
      ],
      [
       "",
       "Every dead machine out there holds a core of red glass, still warm. One core heats a farmhouse all winter."
      ],
      [
       "BESS",
       "Live ones bite. Dunk them in brine till they hiss and go grey. Then they’re safe."
      ],
      [
       "PIP",
       "Red eye, run! Grey eye, done!"
      ]
     ]
    },
    {
     "img": "m1_open2",
     "ph": "field",
     "lines": [
      [
       "PIP",
       "Wolves are done, Jo! Same wolves Howl had when he broke FORGE. Now it looks like a real war mech."
      ],
      [
       "JO",
       "It’s a survey mech, Pip. Right, Gran?"
      ],
      [
       "BESS",
       "Not today. The co-op’s sending a handler out. Calls herself Rook."
      ],
      [
       "PIP",
       "Bet she’s never seen wolves like these."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m1_mid",
     "ph": "field",
     "lines": [
      [
       "ROOK",
       "Look at the wrecks. Every eye’s turned to the masts on the ridge. Somebody’s talking to them."
      ],
      [
       "UNKNOWN",
       "Crew 4. This field is claimed. Leave it."
      ],
      [
       "BESS",
       "Claimed? My dad was born in that field."
      ],
      [
       "ROOK",
       "Wraith. Knock those masts flat."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m1_close",
     "ph": "field",
     "lines": [
      [
       "ROOK",
       "Masts are down. Not bad shooting, Wraith."
      ],
      [
       "JO",
       "I’m a spotter, Rook. I find things. I don’t usually blow them up."
      ],
      [
       "ROOK",
       "Then find me whoever was talking through them. Bring it home, Wraith."
      ],
      [
       "JO",
       "Bring what home? I’m standing in my own yard."
      ],
      [
       "ROOK",
       "…Never mind. Old habit."
      ]
     ]
    }
   ]
  }
 },
 "m2": {
  "brief": [
   "Harbor 9 at midnight: the boom town where every dig crew sells its cores.",
   "Somebody planted spawner pods in the container stacks overnight. Find all four."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Stick to the lanes. Those stacks are too tall to hop, even for you."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Pods print Skitters till you break them. The marker shows the nearest."
    ],
    [
     "UNKNOWN",
     "Those crates came off claimed ground."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Gunner on the quay! Get under the middle crane. I’m lifting you out."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m2_open",
     "ph": "docks_night",
     "lines": [
      [
       "BESS",
       "Our crates sail on the morning boat. That’s a new barn roof, right there."
      ],
      [
       "PIP",
       "A Gunner core’s worth three hundred! What’s “LIVE: ASK AT VANE” mean?"
      ],
      [
       "BESS",
       "A red core nobody quenched. Selling those is against the law. Silas Vane pays triple anyway."
      ],
      [
       "ROOK",
       "Man in the white coat. If he calls you friend, count your fingers."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m2_mid",
     "ph": "docks_night",
     "lines": [
      [
       "JO",
       "Rook. All four pods were hidden in farm crates. Ours. Crew 2’s. Crew 6’s."
      ],
      [
       "ROOK",
       "And Vane’s?"
      ],
      [
       "JO",
       "Right across the lane. Not one pod. Not a scratch."
      ],
      [
       "BESS",
       "Scare the farm crews off, then buy our fields cheap. That’s Vane all over."
      ],
      [
       "ROOK",
       "Maybe. Vane’s a crook, but he’s a careful one."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m2_close",
     "ph": "docks_night",
     "lines": [
      [
       "VANE",
       "Lovely lift, Rook. Shame about all those farm crates, friend."
      ],
      [
       "VANE",
       "When Crew 4 gets tired of digging, I’ll buy that field. Fair price."
      ],
      [
       "BESS",
       "Fair like the place across the creek? Your diggers flattened that house in a day."
      ],
      [
       "VANE",
       "Old houses come down, Mrs. Calloway. Goodnight, friends."
      ],
      [
       "ROOK",
       "Silas. You’re standing under my hook."
      ]
     ]
    }
   ]
  }
 },
 "m3": {
  "brief": [
   "Crew 7 has gone quiet in the pine woods, out by a field of 2126 wrecks.",
   "Find them, guard Rook while she loads them up, and watch the trees for the pack."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Their beacon’s east of the trail. Watch the trees."
    ],
    [
     "ROOK",
     "Hounds crouch, then charge dead straight. Sidestep or hop."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Found them. All three alive, and grumpy. Give me one minute to load up."
    ],
    [
     "ROOK",
     "Keep them off my truck, Wraith. Stay in the ring."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Eyes up. Rust-red one coming out of the trees, twice the size."
    ],
    [
     "ROOK",
     "Clear its pack first, then keep moving. It charges harder."
    ]
   ],
   "3": [
    [
     "ROOK",
     "Crew 7’s clear. Meet me up on the north ridge."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m3_open",
     "ph": "woods",
     "lines": [
      [
       "",
       "The pine woods burned in the war. Now they stand taller than a Gunner, and the wrecks wear moss."
      ],
      [
       "ROOK",
       "No word from Crew 7 since sunup. A dad and two kids, digging by the old wreck field."
      ],
      [
       "JO",
       "Shouldn’t you wait back at the road?"
      ],
      [
       "ROOK",
       "In 2126 I sat in a bunker and listened. I’m done sitting."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m3_mid",
     "ph": "woods",
     "lines": [
      [
       "UNKNOWN",
       "Get your crew out of my yards, Birdie."
      ],
      [
       "",
       "Rook doesn’t answer. For a long moment, she doesn’t move."
      ],
      [
       "JO",
       "Rook? Who’s Birdie?"
      ],
      [
       "ROOK",
       "Nobody’s called me that in fifty years."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m3_close",
     "ph": "woods",
     "lines": [
      [
       "JO",
       "Rook, about Birdie…"
      ],
      [
       "ROOK",
       "Look at these welds instead. Bright. Clean. This thing was built this year."
      ],
      [
       "JO",
       "FORGE is dead. So who’s building new ones?"
      ],
      [
       "PIP",
       "Did you get the big one? I’m calling it Biscuit!"
      ],
      [
       "ROOK",
       "We are not calling it Biscuit."
      ],
      [
       "PIP",
       "Too late."
      ]
     ]
    }
   ]
  }
 },
 "m4": {
  "brief": [
   "Night fog on the creek road. Rook is driving Crew 7 and their cores out of the woods.",
   "Escort her truck to the south road. If the truck is destroyed, the mission fails."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "I only roll while you’re close, Wraith. Stay within 35 metres."
    ],
    [
     "ROOK",
     "Some of them go for my truck. Kill those first."
    ],
    [
     "UNKNOWN",
     "Leave the cores on the road and walk home."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m4_open",
     "ph": "woods_fog",
     "lines": [
      [
       "CREW 7",
       "Miss Rook? What’s the pilot’s real name?"
      ],
      [
       "ROOK",
       "Wraith."
      ],
      [
       "JO",
       "It’s Jo."
      ],
      [
       "ROOK",
       "Copy, Wraith."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m4_mid",
     "ph": "woods_fog",
     "lines": [
      [
       "CREW 7",
       "Who’s the man in the photo? His mech’s got wolves on it. Like yours."
      ],
      [
       "ROOK",
       "Howl. My pilot. He never came out of Foundry 4."
      ],
      [
       "JO",
       "My kid brother copied our wolves off an old poster of him."
      ],
      [
       "ROOK",
       "Pip got the ears wrong."
      ]
     ]
    }
   ],
   "at": "half"
  },
  "close": {
   "panels": [
    {
     "img": "m4_close",
     "ph": "woods_fog",
     "lines": [
      [
       "ROOK",
       "You stayed close. Most don’t."
      ],
      [
       "JO",
       "That’s four fights now. Nobody’s been hurt. Not once."
      ],
      [
       "ROOK",
       "I noticed. They chase folks off, they take the cores, and they let everyone walk."
      ],
      [
       "ROOK",
       "FORGE never let anyone walk."
      ]
     ]
    }
   ]
  }
 },
 "m5": {
  "brief": [
   "A storm over the farm fields. The voice reaches its machines through three relays.",
   "Take all three relays: hold each ring until it’s full. Then Rook can trace the signal."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Stand in each ring till it fills. Never mind the lightning. It only hits them."
    ],
    [
     "UNKNOWN",
     "Copy, Wraith. Trace all you like. Then go home."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Something huge on the east road. Bone white. Use cover between bursts."
    ],
    [
     "UNKNOWN",
     "Meet my newest."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m5_open",
     "ph": "field_storm",
     "lines": [
      [
       "",
       "A storm rolls over farm country. Three more crews have packed up and left this week."
      ],
      [
       "BESS",
       "Crew 2 sold their claim to Vane this morning. For next to nothing."
      ],
      [
       "ROOK",
       "Then we find the voice before anyone else sells. It talks through relays. Relays can be traced."
      ],
      [
       "JO",
       "So I stand in the lightning while you sit in the truck."
      ],
      [
       "ROOK",
       "I’m seventy-four, Wraith. Everything on me is out of warranty. I get the truck."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m5_mid",
     "ph": "field_storm",
     "lines": [
      [
       "ROOK",
       "Got it. The signal runs straight back to one place. Foundry 4."
      ],
      [
       "JO",
       "Where Howl broke FORGE? That place has been cold since the war."
      ],
      [
       "ROOK",
       "Not any more."
      ]
     ]
    }
   ],
   "at": 1
  },
  "close": {
   "panels": [
    {
     "img": "m5_close",
     "ph": "field_storm",
     "lines": [
      [
       "PIP",
       "That’s three big ones down! I’m calling this one Marshmallow."
      ],
      [
       "ROOK",
       "We are still not doing names."
      ],
      [
       "ROOK",
       "Get some sleep, all of you. Tomorrow we drive to Foundry 4."
      ],
      [
       "BESS",
       "Rook. You don’t have to be the one who goes."
      ],
      [
       "ROOK",
       "Fifty years I’ve stayed away from that gate, Bess. That’s long enough."
      ]
     ]
    }
   ]
  }
 },
 "m6": {
  "brief": [
   "The signal leads to Foundry 4: FORGE’s old heart, fenced off and cold since 2126.",
   "Its furnaces are lit again. Hold the yard while Rook pulls the factory log."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Furnaces are hot. Somebody’s been building in here."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Ninety seconds to pull the log. Hold the yard, Wraith."
    ],
    [
     "UNKNOWN",
     "Turn around. There’s nothing left in here for you."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Two big ones at the gate. Fine, Pip. Biscuit and Marshmallow."
    ]
   ],
   "3": [
    [
     "ROOK",
     "Gate’s clear! Bring it home, Wraith. I’m right behind you."
    ],
    [
     "ROOK",
     "Don’t you dare stop for me."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m6_open",
     "ph": "foundry",
     "lines": [
      [
       "",
       "A plaque by the gate: UNITS 01–07 · 2126 · THEY HELD THE LINE."
      ],
      [
       "ROOK",
       "Seven pilots. I learned every one of their names."
      ],
      [
       "JO",
       "Is that why I’m Wraith?"
      ],
      [
       "ROOK",
       "Eyes front, Wraith. Let’s go knock."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m6_mid",
     "ph": "foundry",
     "lines": [
      [
       "ROOK",
       "Got the log. Wraith… look down. By your left foot."
      ],
      [
       "",
       "A hollow in the slag, the shape of a fallen mech. It’s empty. Drag marks lead off into the dark."
      ],
      [
       "ROOK",
       "Howl’s mech went down right here. I said go, and he went."
      ],
      [
       "ROOK",
       "We left him lying here. Somebody moved him."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m6_close",
     "ph": "foundry",
     "lines": [
      [
       "ROOK",
       "The log names no one. Just orders. Hounds, Gunners, things I’ve never seen."
      ],
      [
       "ROOK",
       "Every order’s signed with the same mark. A seven, lying on its side."
      ],
      [
       "JO",
       "A cattle brand?"
      ],
      [
       "ROOK",
       "Not one I know."
      ]
     ]
    },
    {
     "img": "m6_close2",
     "ph": "foundry",
     "lines": [
      [
       "JO",
       "Look at the eye. The crack’s been stitched with new cable."
      ],
      [
       "ROOK",
       "I heard that eye break."
      ],
      [
       "",
       "It flickers red. One more line crawls across Rook’s screen, older than the rest. No mark."
      ],
      [
       "",
       "THE FIELDS BELONG TO THE FACTORY."
      ]
     ]
    }
   ]
  }
 }
};
/* the mission cards and radio lines come from here too, so all of the chapter's words live in one place */
for(const m of MISSIONS){const t=STORY_TEXT['m'+m.id];if(!t)continue;if(t.brief)m.brief=t.brief;
  if(t.radio)for(const k in t.radio)if(m.steps[k])m.steps[k].radio=t.radio[k];}
