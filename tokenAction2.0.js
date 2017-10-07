var tokenAction = tokenAction || (function() {
    'use strict';

    var version = '0.2.3',
	// Forked from TokenAction 0.2.3 - https://github.com/git-kor-av/TokenAction by Kevin - https://app.roll20.net/users/399372/kevin
    // Further Enhancements for personal preference by David Collier - https://app.roll20.net/users/1486161/david-c
	// Based off earlier version enhancements by Michael Balin - https://app.roll20.net/users/243599/michael-balin
	
        sheetVersion = '5th Edition OGL by Roll20 2.0',
        
    checkInstall = function() {
        log('TokenAction v'+version+' is ready!  Designed for use with the '+sheetVersion+' character sheet!');
    },
    
    getSelectedCharacters = function(selected) {
        return _.chain(selected)
            .map(function(s){
                return getObj(s._type,s._id);
            })
            .reject(_.isUndefined)
            .map(function(c){
                return getObj('character', c.get('represents'));
            })
            .filter(_.identity)
            .value();        
    },
    
    createAbility = function(name, pattern, id) {
        var checkAbility = findObjs({_type: 'ability', _characterid: id, name: name});
        
        if (checkAbility[0]) {
            checkAbility[0].set({action: pattern});
        } else {
            createObj('ability', {name: name, action: pattern, characterid: id, istokenaction: true});
        }
    },
    
    createRepeating = function(name, pattern, id) {
        var repeatingAttrs = filterObjs(function(o){
            return o.get('type')==='attribute' && o.get('characterid') === id && o.get('name').match(name);
        });
        
        _.each(repeatingAttrs,function(attr){
            var repeatingId = attr.get('name').split('_')[2],
                repeatingName = attr.get('current'),
                repeatingAction = "%{" + id + "|" + (pattern.replace(/%%RID%%/g,repeatingId)) + "}",
                checkAbility = findObjs({_type: 'ability', _characterid: id, name: repeatingName});
                
            if (checkAbility[0]) {
                checkAbility[0].set({action: repeatingAction});
            } else {
                createObj("ability", {name: repeatingName, action: repeatingAction, characterid: id, istokenaction: true});
            }
        });
    },
    
    isNpc = function(id) {
        var checkNpc = findObjs({_type: 'attribute', _characterid: id, name: 'npc'});
        if (_.isUndefined(checkNpc[0])) {
            return false;
        } else {
            return checkNpc[0].get('current');
        }
    },
    
    deleteAbilities = function(id) {
        var abilities = findObjs ({_type: 'ability', _characterid: id});
        _.each(abilities, function(r) {
            r.remove();
        });
    },
    
    createSpell = function(id) {
        var checkAbility = findObjs({_type: 'ability', _characterid: id, name: 'Spells'}),
            repeatingAttrs = filterObjs(function(o){
                return o.get('type') === 'attribute' && o.get('characterid') === id && o.get('name').match(/repeating_spell-\S+_[^_]+_spellname\b/);
            }),
            spellText = "",
            sk = [],
            sb = {
                'Cantrips': [],
                '1st': [],
                '2nd': [],
                '3rd': [],
                '4th': [],
                '5th': [],
                '6th': [],
                '7th': [],
                '8th': [],
                '9th': []
            };
        
        if (!repeatingAttrs[0]) {
            return;
        }
        
		if (repeatingAttrs[0].get('name').match('repeating_spell-npc')) {
			return;
        }
		
        _.each(repeatingAttrs, function(s){
            var level = s.get('name').split('_')[1].replace('spell-', ''),
                apiButton = "[" + s.get('current') + "](~repeating_spell-" + level + "_" + s.get('name').split('_')[2] + "_spell)";
            
            if (level === "cantrip") {
                level = "Cantrips";
            } else if (level === "1") {
                level = "1st";
            } else if (level === "2") {
                level = "2nd";
            } else if (level === "3") {
                level = "3rd";
            } else if (level === "4") {
                level = "4th";
            } else if (level === "5") {
                level = "5th";
            } else if (level === "6") {
                level = "6th";
            } else if (level === "7") {
                level = "7th";
            } else if (level === "8") {
                level = "8th";
            } else if (level === "9") {
                level = "9th";
            }
            
            sb[level].push(apiButton);
            sb[level].sort();
        });
        
        sk = _.keys(sb);
        
        _.each(sk, function(e){
            if (_.isEmpty(sb[e])){
                sb = _.omit(sb, e);
            }
        });
        
        sk = _.keys(sb);
        
        _.each(sk, function(e){
            spellText += "**" + e + ":**" + "\n" + sb[e].join(' | ') + "\n\n";
        });
        
    if (checkAbility[0]) {
            checkAbility[0].set({action: "/w @{character_name} &{template:atk} {{desc=" + spellText + "}}"});
        } else {
            createObj("ability", {name: 'Spells', action: "/w @{character_name} &{template:atk} {{desc=" + spellText + "}}", characterid: id, istokenaction: true});
        }
    },

    sortRepeating = function(name, pattern, id) {
        var repeatingAttrs = filterObjs(function(o){
            return o.get('type')==='attribute' && o.get('characterid') === id && o.get('name').match(name);
        }),
            sorted = _.sortBy(repeatingAttrs, (o)=> o.get('current'));
        
        _.each(sorted,function(attr){
            var repeatingId = attr.get('name').split('_')[2],
                repeatingName = "a-"+attr.get('current'),
                repeatingAction = "%{" + id + "|" + (pattern.replace(/%%RID%%/g,repeatingId)) + "}";
                if (pattern.match('npcaction-l')){
                    repeatingName = "al-"+attr.get('current');
                }
                var checkAbility = findObjs({_type: 'ability', _characterid: id, name: repeatingName});
                if (checkAbility[0]) {
                    checkAbility[0].set({action: repeatingAction});
                } else {
                    createObj("ability", {name: repeatingName, action: repeatingAction, characterid: id, istokenaction: true});
                }
        });
    },	
	
	setAttribute = function(char_id, attr_name, newVal) {
        var attribute = findObjs({
		    _type: "attribute",
    		_characterid: char_id,
    		_name: attr_name
    	})[0];

    if (attribute == undefined) {
    		createObj("attribute", {
    		name: attr_name,
    		current: newVal,
    		characterid: char_id
    		});
    		} else {
    	attribute.set("current", newVal.toString());
    	}
    },													 

	
	hasFlag = function(id, flag) {
        var checkNpc = findObjs({_type: 'attribute', _characterid: id, name: flag});
        if (_.isUndefined(checkNpc[0])) {
            return false;
        } else {
            return (checkNpc[0].get('current') > 0);
        }
    },
	
    handleInput = function(msg) {
        var char;
        
		if (msg.type === 'api' && msg.content.search(/^!ta\b/) !== -1 && msg.selected) {
			char = _.uniq(getSelectedCharacters(msg.selected));
			
			_.each(char, function(a) {
			    if (isNpc(a.id) === "1") {
					// This is NPC Section
					createAbility('1_Init', "%{" + a.id + "|npc_init}", a.id);
					var s = '@{selected|wtype}&{template:npc} @{selected|npc_name_flag} @{selected|rtype}+?{Ability';
					s += '|Acrobatics,'; if (hasFlag(a.id, 'npc_acrobatics_flag')){s += '[[@{selected|npc_acrobatics}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_acrobatics}]]]]&#125;&#125; {{mod=[[@{selected|npc_acrobatics}]]&#125;&#125;'} else {s += '[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{mod=[[[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; '};	s += '{{rname=Acrobatics&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Animal Handling,'; if (hasFlag(a.id, 'npc_animal_handling_flag')){s += '[[@{selected|npc_animal_handling}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_animal_handling}]]]]&#125;&#125; {{mod=[[@{selected|npc_animal_handling}]]&#125;&#125;'} else {s += '[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; '};	s += '{{rname=Animal Handling&#125;&#125; {{type=Skill&#125;&#125; ';		
					s += '|Arcana,'; if (hasFlag(a.id, 'npc_arcana_flag')){s += '[[@{selected|npc_arcana}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_arcana}]]]]&#125;&#125; {{mod=[[@{selected|npc_arcana}]]&#125;&#125;'} else {s += '[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{mod=[[[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; '};	s += '{{rname=Arcana&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Athletics,'; if (hasFlag(a.id, 'npc_athletics_flag')){s += '[[@{selected|npc_athletics}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_athletics}]]]]&#125;&#125; {{mod=[[@{selected|npc_athletics}]]&#125;&#125;'} else {s += '[[@{selected|strength_mod}]][STR]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|strength_mod}]][STR]]]&#125;&#125; {{mod=[[[[@{selected|strength_mod}]][STR]]]&#125;&#125; '};	s += '{{rname=Athletics&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Deception,'; if (hasFlag(a.id, 'npc_deception_flag')){s += '[[@{selected|npc_deception}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_deception}]]]]&#125;&#125; {{mod=[[@{selected|npc_deception}]]&#125;&#125;'} else {s += '[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; '};	s += '{{rname=Deception&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|History,'; if (hasFlag(a.id, 'npc_history_flag')){s += '[[@{selected|npc_history}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_history}]]]]&#125;&#125; {{mod=[[@{selected|npc_history}]]&#125;&#125;'} else {s += '[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{mod=[[[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; '};	s += '{{rname=History&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Insight,'; if (hasFlag(a.id, 'npc_insight_flag')){s += '[[@{selected|npc_insight}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_insight}]]]]&#125;&#125; {{mod=[[@{selected|npc_insight}]]&#125;&#125;'} else {s += '[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{mod=[[[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; '};	s += '{{rname=Insight&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Intimidation,'; if (hasFlag(a.id, 'npc_intimidation_flag')){s += '[[@{selected|npc_intimidation}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_intimidation}]]]]&#125;&#125; {{mod=[[@{selected|npc_intimidation}]]&#125;&#125;'} else {s += '[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; '};	s += '{{rname=Intimidation&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Investigation,'; if (hasFlag(a.id, 'npc_investigation_flag')){s += '[[@{selected|npc_investigation}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_investigation}]]]]&#125;&#125; {{mod=[[@{selected|npc_investigation}]]&#125;&#125;'} else {s += '[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{mod=[[[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; '};	s += '{{rname=Investigation&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Medicine,'; if (hasFlag(a.id, 'npc_medicine_flag')){s += '[[@{selected|npc_medicine}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_medicine}]]]]&#125;&#125; {{mod=[[@{selected|npc_medicine}]]&#125;&#125;'} else {s += '[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{mod=[[[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; '};	s += '{{rname=Medicine&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Perception,'; if (hasFlag(a.id, 'npc_perception_flag')){s += '[[@{selected|npc_perception}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_perception}]]]]&#125;&#125; {{mod=[[@{selected|npc_perception}]]&#125;&#125;'} else {s += '[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{mod=[[[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; '};	s += '{{rname=Perception&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Performance,'; if (hasFlag(a.id, 'npc_performance_flag')){s += '[[@{selected|npc_performance}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_performance}]]]]&#125;&#125; {{mod=[[@{selected|npc_performance}]]&#125;&#125;'} else {s += '[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; '};	s += '{{rname=Performance&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Persuasion,'; if (hasFlag(a.id, 'npc_persuasion_flag')){s += '[[@{selected|npc_persuasion}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_persuasion}]]]]&#125;&#125; {{mod=[[@{selected|npc_persuasion}]]&#125;&#125;'} else {s += '[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; '};	s += '{{rname=Persuasion&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Religion,'; if (hasFlag(a.id, 'npc_religion_flag')){s += '[[@{selected|npc_religion}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_religion}]]]]&#125;&#125; {{mod=[[@{selected|npc_religion}]]&#125;&#125;'} else {s += '[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{mod=[[[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; '};	s += '{{rname=Religion&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Sleight of Hand,'; if (hasFlag(a.id, 'npc_sleight_of_hand_flag')){s += '[[@{selected|npc_sleight_of_hand}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_sleight_of_hand}]]]]&#125;&#125; {{mod=[[@{selected|npc_sleight_of_hand}]]&#125;&#125;'} else {s += '[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{mod=[[[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; '};	s += '{{rname=Sleight of Hand&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Stealth,'; if (hasFlag(a.id, 'npc_stealth_flag')){s += '[[@{selected|npc_stealth}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_stealth}]]]]&#125;&#125; {{mod=[[@{selected|npc_stealth}]]&#125;&#125;'} else {s += '[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{mod=[[[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; '};	s += '{{rname=Stealth&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Survival,'; if (hasFlag(a.id, 'npc_survival_flag')){s += '[[@{selected|npc_survival}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_survival}]]]]&#125;&#125; {{mod=[[@{selected|npc_survival}]]&#125;&#125;'} else {s += '[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{mod=[[[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; '};	s += '{{rname=Survival&#125;&#125; {{type=Skill&#125;&#125; ';
					s += '|Strength,[[@{selected|strength_mod}]][STR]]]&#125;&#125; {{rname=Strength&#125;&#125; {{mod=[[[[@{selected|strength_mod}]][STR]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|strength_mod}]][STR]]]&#125;&#125; {{type=Ability&#125;&#125; ';
					s += '|Dexterity,[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{rname=Dexterity&#125;&#125; {{mod=[[[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{type=Ability&#125;&#125; ';
					s += '|Constitution,[[@{selected|constitution_mod}]][CON]]]&#125;&#125; {{rname=Constitution&#125;&#125; {{mod=[[[[@{selected|constitution_mod}]][CON]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|constitution_mod}]][CON]]]&#125;&#125; {{type=Ability&#125;&#125; ';
					s += '|Intelligence,[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{rname=Intelligence&#125;&#125; {{mod=[[[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|intelligence_mod}]][INT]]]&#125;&#125; {{type=Ability&#125;&#125; ';
					s += '|Wisdom,[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{rname=Wisdom&#125;&#125; {{mod=[[[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{type=Ability&#125;&#125; ';
					s += '|Charisma,[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{rname=Charisma&#125;&#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{type=Ability&#125;&#125;}';					
					createAbility('2_SkillNPC', s, a.id);

					s = '@{selected|wtype}&{template:npc} @{selected|npc_name_flag} @{selected|rtype}+?{Save';
					s += '|Strength,'; if (hasFlag(a.id, 'npc_str_save_flag')){s += '[[@{selected|npc_str_save}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_str_save}]]]]&#125;&#125; {{mod=[[@{selected|npc_str_save}]]&#125;&#125;'} else {s += '[[@{selected|strength_mod}]][STR]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|strength_mod}]][STR]]]&#125;&#125; {{mod=[[[[@{selected|strength_mod}]][STR]]]&#125;&#125; '};	s += '{{rname=Strength Save&#125;&#125; {{type=Save&#125;&#125; ';
					s += '|Dexterity,'; if (hasFlag(a.id, 'npc_dex_save_flag')){s += '[[@{selected|npc_dex_save}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_dex_save}]]]]&#125;&#125; {{mod=[[@{selected|npc_dex_save}]]&#125;&#125;'} else {s += '[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; {{mod=[[[[@{selected|dexterity_mod}]][DEX]]]&#125;&#125; '};	s += '{{rname=Dexterity Save&#125;&#125; {{type=Save&#125;&#125; ';
					s += '|Constitution,'; if (hasFlag(a.id, 'npc_con_save_flag')){s += '[[@{selected|npc_con_save}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_con_save}]]]]&#125;&#125; {{mod=[[@{selected|npc_con_save}]]&#125;&#125;'} else {s += '[[@{selected|constitution_mod}]][CON]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|constitution_mod}]][CON]]]&#125;&#125; {{mod=[[[[@{selected|constitution_mod}]][CON]]]&#125;&#125; '};	s += '{{rname=Constitution Save&#125;&#125; {{type=Save&#125;&#125; ';
					s += '|Intelligence,'; if (hasFlag(a.id, 'npc_int_save_flag')){s += '[[@{selected|npc_int_save}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_int_save}]]]]&#125;&#125; {{mod=[[@{selected|npc_int_save}]]&#125;&#125;'} else {s += '[[@{selected|intelligence_mod}]][CON]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|intelligence_mod}]][CON]]]&#125;&#125; {{mod=[[[[@{selected|intelligence_mod}]][CON]]]&#125;&#125; '};	s += '{{rname=Intelligence Save&#125;&#125; {{type=Save&#125;&#125; ';
					s += '|Wisdom,'; if (hasFlag(a.id, 'npc_wis_save_flag')){s += '[[@{selected|npc_wis_save}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_wis_save}]]]]&#125;&#125; {{mod=[[@{selected|npc_wis_save}]]&#125;&#125;'} else {s += '[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; {{mod=[[[[@{selected|wisdom_mod}]][WIS]]]&#125;&#125; '};	s += '{{rname=Wisdom Save&#125;&#125; {{type=Save&#125;&#125; ';
					s += '|Charisma,'; if (hasFlag(a.id, 'npc_cha_save_flag')){s += '[[@{selected|npc_cha_save}]]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|npc_cha_save}]]]]&#125;&#125; {{mod=[[@{selected|npc_cha_save}]]&#125;&#125;'} else {s += '[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{r1=[[@{selected|d20}+[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; {{mod=[[[[@{selected|charisma_mod}]][CHA]]]&#125;&#125; '};	s += '{{rname=Charisma Save&#125;&#125; {{type=Save&#125;&#125;}';
					createAbility('3_SaveNPC', s + "}}", a.id);	
					
			        createRepeating(/repeating_npcaction_[^_]+_name\b/, 'repeating_npcaction_%%RID%%_npc_action', a.id);
			        createRepeating(/repeating_npcaction-l_[^_]+_name\b/, 'repeating_npcaction-l_%%RID%%_npc_action', a.id);
			        createSpell(a.id);
			        
			        // Set Roll Queries: Always = "{{always=1}} {{r2=[[@{d20}" , Toggle = "@{advantagetoggle}" , Query = "{{query=1}} ?{Advantage?|Normal Roll,&#123&#123normal=1&#125&#125 &#123&#123r2=[[0d20|Advantage,&#123&#123advantage=1&#125&#125 &#123&#123r2=[[@{d20}|Disadvantage,&#123&#123disadvantage=1&#125&#125 &#123&#123r2=[[@{d20}}" , Never = "{{normal=1}} {{r2=[[0d20"
					setAttribute(a.id, "rtype", "@{advantagetoggle}");
					// Set Whisper Rolls to GM (watch space at end of always): Never = "" , Toggle = "@{whispertoggle}" , Query = "?{Whisper?|Public Roll,|Whisper Roll,/w gm }" , Always = "/w gm "
					setAttribute(a.id, "wtype", "");
			        // Set Auto Damage Roll: Don't Auto Roll Damage = "pick" , Auto Roll Damage and Crit = "full"
					setAttribute(a.id, "dtype", "full");
					// Toggles - if using whisper or advanage toggle you can set the default here
					// Set Advantage Toggle: Advantage = "{{query=1}} {{advantage=1}} {{r2=[[@{d20}" , Normal = "{{query=1}} {{normal=1}} {{r2=[[0d20" , Disadvantage = "{{query=1}} {{disadvantage=1}} {{r2=[[@{d20}"
					setAttribute(a.id, "advantagetoggle", "{{query=1}} {{normal=1}} {{r2=[[0d20");
					// Set Whisper Toggle (watch space at end of To GM): To Public = "" , To GM "/w gm "
					setAttribute(a.id, "whispertoggle", "");
			    } else {
					// This is PC Section
			        createAbility('1_Init', "%{" + a.id + "|initiative}", a.id);					
					createAbility('2_Check', "@{selected|wtype}&{template:simple} @{selected|rtype}?{Ability|Acrobatics, +@{selected|acrobatics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Acrobatics&" + "#125;&" + "#125; {{mod=@{selected|acrobatics_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|acrobatics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Animal Handling, +@{selected|animal_handling_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Animal Handling&" + "#125;&" + "#125; {{mod=@{selected|animal_handling_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|animal_handling_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Arcana, +@{selected|arcana_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Arcana&" + "#125;&" + "#125; {{mod=@{selected|arcana_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|arcana_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Athletics, +@{selected|athletics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Athletics&" + "#125;&" + "#125; {{mod=@{selected|athletics_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|athletics_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Deception, +@{selected|deception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Deception&" + "#125;&" + "#125; {{mod=@{selected|deception_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|deception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |History, +@{selected|history_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=History&" + "#125;&" + "#125; {{mod=@{selected|history_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|history_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Insight, +@{selected|insight_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Insight&" + "#125;&" + "#125; {{mod=@{selected|insight_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|insight_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Intimidation, +@{selected|intimidation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Intimidation&" + "#125;&" + "#125; {{mod=@{selected|intimidation_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|intimidation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Investigation, +@{selected|investigation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Investigation&" + "#125;&" + "#125; {{mod=@{selected|investigation_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|investigation_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Medicine, +@{selected|medicine_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Medicine&" + "#125;&" + "#125; {{mod=@{selected|medicine_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|medicine_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Nature, +@{selected|nature_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Nature&" + "#125;&" + "#125; {{mod=@{selected|nature_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|nature_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Perception, +@{selected|perception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Perception&" + "#125;&" + "#125; {{mod=@{selected|perception_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|perception_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Performance, +@{selected|performance_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Performance&" + "#125;&" + "#125; {{mod=@{selected|performance_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|performance_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Persuasion, +@{selected|persuasion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Persuasion&" + "#125;&" + "#125; {{mod=@{selected|persuasion_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|persuasion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Religion, +@{selected|religion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Religion&" + "#125;&" + "#125; {{mod=@{selected|religion_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|religion_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Sleight of Hand, +@{selected|sleight_of_hand_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Sleight of Hand&" + "#125;&" + "#125; {{mod=@{selected|sleight_of_hand_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|sleight_of_hand_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Stealth, +@{selected|stealth_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Stealth&" + "#125;&" + "#125; {{mod=@{selected|stealth_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|stealth_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Survival, +@{selected|survival_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; {{rname=Survival&" + "#125;&" + "#125; {{mod=@{selected|survival_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|survival_bonus}@{selected|pbd_safe} ]]&" + "#125;&" + "#125; |Strength, +@{selected|strength_mod}@{selected|jack_attr}[STR]]]&" + "#125;&" + "#125; {{rname=Strength&" + "#125;&" + "#125; {{mod=@{selected|strength_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|strength_mod}@{selected|jack_attr}[STR]]]&" + "#125;&" + "#125; |Dexterity, +@{selected|dexterity_mod}@{selected|jack_attr}[DEX]]]&" + "#125;&" + "#125; {{rname=Dexterity&" + "#125;&" + "#125; {{mod=@{selected|dexterity_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|dexterity_mod}@{selected|jack_attr}[DEX]]]&" + "#125;&" + "#125; |Constitution, +@{selected|constitution_mod}@{selected|jack_attr}[CON]]]&" + "#125;&" + "#125; {{rname=Constitution&" + "#125;&" + "#125; {{mod=@{selected|constitution_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|constitution_mod}@{selected|jack_attr}[CON]]]&" + "#125;&" + "#125; |Intelligence, +@{selected|intelligence_mod}@{selected|jack_attr}[INT]]]&" + "#125;&" + "#125; {{rname=Intelligence&" + "#125;&" + "#125; {{mod=@{selected|intelligence_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|intelligence_mod}@{selected|jack_attr}[INT]]]&" + "#125;&" + "#125; |Wisdom, +@{selected|wisdom_mod}@{selected|jack_attr}[WIS]]]&" + "#125;&" + "#125; {{rname=Wisdom&" + "#125;&" + "#125; {{mod=@{selected|wisdom_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|wisdom_mod}@{selected|jack_attr}[WIS]]]&" + "#125;&" + "#125; |Charisma, +@{selected|charisma_mod}@{selected|jack_attr}[CHA]]]&" + "#125;&" + "#125; {{rname=Charisma&" + "#125;&" + "#125; {{mod=@{selected|charisma_mod}@{selected|jack_bonus}&" + "#125;&" + "#125; {{r1=[[ @{selected|d20} + @{selected|charisma_mod}@{selected|jack_attr}[CHA]]]&" + "#125;&" + "#125; } @{selected|global_skill_mod} @{selected|charname_output}}", a.id);
			        createAbility('3_Save', "@{selected|wtype}&{template:simple} @{selected|rtype}?{Save|Strength, +@{selected|strength_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Strength Save&" + "#125;&" + "#125 {{mod=@{selected|strength_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|strength_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Dexterity, +@{selected|dexterity_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Dexterity Save&" + "#125;&" + "#125 {{mod=@{selected|dexterity_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|dexterity_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Constitution, +@{selected|constitution_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Constitution Save&" + "#125;&" + "#125 {{mod=@{selected|constitution_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|constitution_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Intelligence, +@{selected|intelligence_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Intelligence Save&" + "#125;&" + "#125 {{mod=@{selected|intelligence_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|intelligence_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Wisdom, +@{selected|wisdom_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Wisdom Save&" + "#125;&" + "#125 {{mod=@{selected|wisdom_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|wisdom_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; |Charisma, +@{selected|charisma_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125; {{rname=Charisma Save&" + "#125;&" + "#125 {{mod=@{selected|charisma_save_bonus}&" + "#125;&" + "#125; {{r1=[[@{selected|d20}+@{selected|charisma_save_bonus}@{selected|pbd_safe}]]&" + "#125;&" + "#125;}@{selected|global_save_mod}@{selected|charname_output}", a.id);
			        createRepeating(/repeating_attack_[^_]+_atkname\b/, 'repeating_attack_%%RID%%_attack', a.id);
			        createSpell(a.id);
			    }
			    sendChat("TokenAction", "/w " + msg.who + " Created Token Actions for " + a.get('name') + ".");
			});
		} else if (msg.type === 'api' && msg.content.search(/^!deleteta\b/) !== -1 && msg.selected) {
		    char = _.uniq(getSelectedCharacters(msg.selected));
		    
		    _.each(char, function(d) {
		        deleteAbilities(d.id);
		        sendChat("TokenAction", "/w " + msg.who + " Deleted Token Actions for " + d.get('name') + ".");
		    });
		} else if (msg.type === 'api' && msg.content.search(/^!sortta\b/) !== -1 && msg.selected) {
		    char = _.uniq(getSelectedCharacters(msg.selected));
		    
		    _.each(char, function(a) {
		        if (isNpc(a.id) === "1") {
		            createAbility('Init', "%{" + a.id + "|npc_init}", a.id);
		            sortRepeating(/repeating_npcaction_[^_]+_name\b/, 'repeating_npcaction_%%RID%%_npc_action', a.id);
		            sortRepeating(/repeating_npcaction-l_[^_]+_name\b/, 'repeating_npcaction-l_%%RID%%_npc_action', a.id);
		            createSpell(a.id);
		        }
		        sendChat("TokenAction", "/w " + msg.who + " Created Token Actions for " + a.get('name') + ".");
		    });
		}
		return;
	},

    registerEventHandlers = function() {
        on('chat:message', handleInput);
    };

    return {
        CheckInstall: checkInstall,
        RegisterEventHandlers: registerEventHandlers
    };
}());

on('ready',function() {
    'use strict';

    tokenAction.CheckInstall();
    tokenAction.RegisterEventHandlers();
});