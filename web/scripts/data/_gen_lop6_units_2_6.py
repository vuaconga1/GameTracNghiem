#!/usr/bin/env python3
"""Generate lop6-unit{2-6}-content.json (Unit 1 conventions)."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parent


def mc(exercise, question, answer, options, type_label="Multiple choice"):
    accept = [answer]
    for i, opt in enumerate(options):
        if opt == answer:
            accept.extend([chr(65 + i), chr(97 + i)])
            break
    return {
        "type": "multiple_choice",
        "typeLabel": type_label,
        "skill": "reading",
        "exercise": exercise,
        "question": question,
        "answer": answer,
        "options": options,
        "accept": accept,
        "fillMode": False,
    }


def odd(exercise, options, answer):
    labeled = "  ".join(f"{chr(65 + i)}. {o}" for i, o in enumerate(options))
    return mc(
        exercise,
        f"Circle the word that has the underlined part pronounced differently: {labeled}",
        answer,
        options,
        "Odd one out",
    )


def fill(exercise, question, answer, accept=None):
    return {
        "type": "fill_blank",
        "typeLabel": "Fill blank",
        "skill": "reading",
        "exercise": exercise,
        "question": question,
        "answer": answer,
        "options": [],
        "accept": accept or [answer],
        "fillMode": True,
    }


def wf(exercise, question, answer, accept=None):
    return {
        "type": "word_form",
        "typeLabel": "Word form",
        "skill": "writing",
        "exercise": exercise,
        "question": question,
        "answer": answer,
        "options": [],
        "accept": accept or [answer],
        "fillMode": True,
    }


def gr(hint, source, answers, prefix="", suffix=""):
    return {"source": source, "prefix": prefix, "suffix": suffix, "hint": hint, "answers": answers}


def dump(unit: dict) -> None:
    path = OUT / f"lop6-unit{unit['unit']}-content.json"
    path.write_text(json.dumps(unit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"U{unit['unit']}: quiz={len(unit['quiz'])} grammar={len(unit['grammar'])} "
        f"scramble={len(unit['scramble'])} pron={len(unit['pronunciation'])} "
        f"rac={len(unit.get('read_and_complete') or [])} cc={len(unit.get('choose_and_circle') or [])}"
    )


def unit2():
    ex_odd = "U2 Pronunciation — Odd one out"
    ex_wf = "U2 Word form"
    quiz = [
        odd(ex_odd, ["schools", "shops", "pets", "carts"], "schools"),
        odd(ex_odd, ["pens", "closets", "sweets", "lamps"], "pens"),
        odd(ex_odd, ["rulers", "pencils", "bags", "books"], "books"),
        odd(ex_odd, ["matches", "makes", "brushes", "peaches"], "makes"),
        odd(ex_odd, ["bees", "cupboards", "watches", "bedrooms"], "watches"),
        odd(ex_odd, ["feast", "seat", "bread", "heat"], "bread"),
        odd(ex_odd, ["peanut", "cut", "shut", "put"], "put"),
        odd(ex_odd, ["what", "flat", "sand", "Saturday"], "what"),
        odd(ex_odd, ["hike", "beside", "hide", "picnic"], "picnic"),
        odd(ex_odd, ["washed", "sacred", "booked", "hoped"], "sacred"),
        odd(ex_odd, ["forms", "chairs", "seats", "keys"], "seats"),
        odd(ex_odd, ["papers", "bosses", "brushes", "foxes"], "papers"),
        odd(ex_odd, ["cats", "dogs", "phones", "drawers"], "cats"),
        odd(ex_odd, ["pigs", "plants", "tables", "computers"], "plants"),
        odd(ex_odd, ["beaches", "watches", "sinks", "lunches"], "sinks"),
        fill("U2 Vocabulary — Complete the sentences", "It's cold here. Are there any ________?", "blankets", ["blankets", "blanket"]),
        fill("U2 Vocabulary — Complete the sentences", "I'm a bit stomachache. Where is the ________?", "toilet"),
        fill("U2 Vocabulary — Complete the sentences", "How hot the weather is! Turn on the ________, please.", "ceiling fan", ["ceiling fan", "fan"]),
        fill("U2 Vocabulary — Complete the sentences", "Are there any ________ on the wall?", "posters", ["posters", "poster"]),
        fill("U2 Vocabulary — Complete the sentences", "I need to wash my face. Are there any ________ in the bathroom?", "sinks", ["sinks", "sink"]),
        fill("U2 Vocabulary — Complete the sentences", "Take a seat on the ________ over there.", "sofa", ["sofa", "Sofa"]),
        fill("U2 Vocabulary — Complete the sentences", "We can use the ________ to cook sticky rice.", "cooker"),
        fill("U2 Vocabulary — Complete the sentences", "It's so dark. Turn on the ________, please.", "light"),
        *[
            fill("U2 Vocabulary — Unscramble", a, b)
            for a, b in [
                ("ergnad → ________", "garden"),
                ("amrhoobt → ________", "bathroom"),
                ("moordeb → ________", "bedroom"),
                ("hcnekit → ________", "kitchen"),
                ("nviligomor → ________", "living room"),
                ("gnidinrmoo → ________", "dining room"),
                ("citta → ________", "attic"),
                ("ragega → ________", "garage"),
            ]
        ],
        wf(ex_wf, "I keep my socks in the bottom ________. (DRAW)", "drawer"),
        wf(ex_wf, "I don't attach any ________ to these rumours. (IMPORTANT)", "importance"),
        wf(ex_wf, "Payment is ________ upon delivery of the goods. (CONDITION)", "conditional"),
        wf(ex_wf, "This story is apparently a complete ________. (INVENT)", "invention"),
        wf(ex_wf, "What a ________ thing to say! (BEAUTY)", "beautiful"),
        wf(ex_wf, "There's no ________ in the results. (DIFFERENT)", "difference"),
        wf(ex_wf, "Do you get many ________? (VISIT)", "visitors", ["visitors", "visitor"]),
        wf(ex_wf, "You're the ________ one. (CREATE)", "creative"),
        wf(ex_wf, "The road gradually ________ out. (WIDE)", "widens", ["widens", "widen"]),
        wf(ex_wf, "This room is twice the ________ of the kitchen. (LONG)", "length"),
        wf(ex_wf, "There are four ________ in my house. (BOOKSHELF)", "bookshelves"),
        wf(ex_wf, "My mother goes ________ twice a week. (SHOP)", "shopping"),
        wf(ex_wf, "He greets me in a ________ way. (FRIEND)", "friendly"),
        wf(ex_wf, "What's Maco's ________? - She's British. (NATION)", "nationality"),
        wf(ex_wf, "Yoko is from Japan. She is ________. (JAPAN)", "Japanese"),
        wf(ex_wf, "These children like ________ weather. (SUN)", "sunny"),
        wf(ex_wf, "Lan's classroom is on the ________ floor. (TWO)", "second"),
        mc("U2 Speaking — Match", "Where do you live?", "I live in a town", ["There are five.", "Between the study and the stairs.", "I live in a town", "My bedroom."], "Speaking match"),
        mc("U2 Speaking — Match", "Who do you live with?", "I live with my parents and sister.", ["I live with my parents and sister.", "My bedroom.", "A sofa set, a television and a lamp.", "There are five."], "Speaking match"),
        mc("U2 Speaking — Match", "How many rooms are there?", "There are five.", ["There are five.", "I live in a town", "My bedroom.", "Yes. There's a big one on the wall"], "Speaking match"),
        mc("U2 Speaking — Match", "What's in the living room?", "A sofa set, a television and a lamp.", ["A sofa set, a television and a lamp.", "My bedroom.", "I live in a town", "There are five."], "Speaking match"),
        mc("U2 Speaking — Match", "What is your favourite room?", "My bedroom.", ["My bedroom.", "There are five.", "I live in a town", "Between the study and the stairs."], "Speaking match"),
        mc("U2 Reading — Matching headings", "Paragraph A best title:", "Choosing between the countryside and the city", ["How to set up your room to make it cozy", "Why city houses cost too much money", "Great storage furniture for bedrooms", "Choosing between the countryside and the city"], "Matching headings"),
        mc("U2 Reading — Matching headings", "Paragraph B best title:", "The best appliances and cupboards for a kitchen", ["How to set up your room to make it cozy", "Great storage furniture for bedrooms", "The best appliances and cupboards for a kitchen", "Choosing between the countryside and the city"], "Matching headings"),
        mc("U2 Reading — Matching headings", "Paragraph C best title:", "Great storage furniture for bedrooms", ["How to set up your room to make it cozy", "Great storage furniture for bedrooms", "The best appliances and cupboards for a kitchen", "Why city houses cost too much money"], "Matching headings"),
        mc("U2 Reading — Matching headings", "Paragraph D best title:", "How to set up your room to make it cozy", ["How to set up your room to make it cozy", "Why city houses cost too much money", "Great storage furniture for bedrooms", "Choosing between the countryside and the city"], "Matching headings"),
        mc("U2 Reading — Matching information", "Natural light helps you get ready in the morning.", "C", ["A", "B", "C", "D"], "Matching information"),
        mc("U2 Reading — Matching information", "Fun places you can visit quickly in the city.", "A", ["A", "B", "C", "D"], "Matching information"),
        mc("U2 Reading — Matching information", "A kitchen appliance that saves time on chores.", "B", ["A", "B", "C", "D"], "Matching information"),
        mc("U2 Reading — Matching information", "Placing furniture creatively creates a quiet spot.", "D", ["A", "B", "C", "D"], "Matching information"),
        mc("U2 Reading — Dialogue T/F/NG", "Amy lives in a spacious country house.", "FALSE", ["TRUE", "FALSE", "NOT GIVEN"], "Reading T/F/NG"),
        mc("U2 Reading — Dialogue T/F/NG", "Ben lives in a flat on the fourth floor.", "TRUE", ["TRUE", "FALSE", "NOT GIVEN"], "Reading T/F/NG"),
        mc("U2 Reading — Dialogue T/F/NG", "Amy's flat has a balcony with plants.", "NOT GIVEN", ["TRUE", "FALSE", "NOT GIVEN"], "Reading T/F/NG"),
        mc("U2 Reading — Dialogue T/F/NG", "Amy uses a dishwasher to avoid washing plates by hand.", "TRUE", ["TRUE", "FALSE", "NOT GIVEN"], "Reading T/F/NG"),
        mc("U2 Reading — Dialogue T/F/NG", "Amy's chest of drawers is painted white.", "NOT GIVEN", ["TRUE", "FALSE", "NOT GIVEN"], "Reading T/F/NG"),
        mc("U2 Reading — Dialogue T/F/NG", "The bathroom is across the hall from Amy's bedroom.", "TRUE", ["TRUE", "FALSE", "NOT GIVEN"], "Reading T/F/NG"),
    ]
    ht = "U2 Grammar — There is/There are"
    hp = "U2 Grammar — Prepositions"
    hw = "U2 Writing — Make complete sentences"
    hr = "U2 Writing — Reorder the words"
    grammar = [
        gr(ht, "There ______ 25 students in the class.", ["are"], "There", "25 students in the class."),
        gr(ht, "There ______ a big wardrobe in my sister's room.", ["is"], "There", "a big wardrobe in my sister's room."),
        gr(ht, "There ______ a computer and a TV in my room.", ["is"], "There", "a computer and a TV in my room."),
        gr(ht, "There ______ good programs on television.", ["are"], "There", "good programs on television."),
        gr(ht, "There ______ some furniture in my bedroom.", ["is"], "There", "some furniture in my bedroom."),
        gr(ht, "There ______ four eggs in the fridge.", ["are"], "There", "four eggs in the fridge."),
        gr(ht, "There ______ a lot of water in the bottle.", ["is"], "There", "a lot of water in the bottle."),
        gr(ht, "There ______ no paper in the printer.", ["is"], "There", "no paper in the printer."),
        gr(ht, "Is there a bath in the bathroom?", ["Is there a bath in the bathroom?", "Is there a bath in the bathroom"]),
        gr(ht, "There are some shops near our new house.", ["There are some shops near our new house.", "There are some shops near our new house"]),
        gr(ht, "There isn't a television in my bedroom.", ["There isn't a television in my bedroom.", "There is not a television in my bedroom."]),
        gr(ht, "Are there any cupboards in the dining room?", ["Are there any cupboards in the dining room?", "Are there any cupboards in the dining room"]),
        gr(hp, "The dining room is ______ the living room and the kitchen.", ["between"], "The dining room is", "the living room and the kitchen."),
        gr(hp, "The bath is ______ the bathroom.", ["in"], "The bath is", "the bathroom."),
        gr(hp, "The flower vase is ______ the chest of drawers.", ["on"], "The flower vase is", "the chest of drawers."),
        gr(hp, "The fridge is ______ the cooker.", ["next to", "beside"], "The fridge is", "the cooker."),
        gr(hp, "The mirror is ______ the bathroom sink.", ["above", "over"], "The mirror is", "the bathroom sink."),
        gr(hw, "There/ book/ on/ the table.", ["There is a book on the table.", "There is a book on the table"]),
        gr(hw, "There/ shoes/ under/ the chair.", ["There are shoes under the chair.", "There are some shoes under the chair."]),
        gr(hw, "There/ not/ TV/ in/ his room.", ["There isn't a TV in his room.", "There is not a TV in his room."]),
        gr(hr, "house/ a/ Minh/ lake/ a/ lives/ in/ near.", ["Minh lives in a house near a lake.", "Minh lives in a house near a lake"]),
        gr(hr, "yard/ front/ school/ There/ big/ of/ is/ our/ in/ a.", ["There is a big yard in front of our school.", "There is a big yard in front of our school"]),
        gr(hr, "Minh's/ six/ There/ in/ rooms/ house/ are.", ["There are six rooms in Minh's house.", "There are six rooms in Minh's house"]),
        gr(hr, "on/ floor/ classroom/ the/ is/ Our/ first.", ["Our classroom is on the first floor.", "Our classroom is on the first floor"]),
    ]
    return {
        "unit": 2,
        "title": "My Home",
        "source": "PDF/GRADE 6 GLOBAL SUCCESS FINAL.pdf (pages 17–30)",
        "skipped": [
            {"reason": "Cần UI cột âm", "item": "Pronunciation Task 1"},
            {"reason": "Thiếu ảnh", "item": "Vocabulary Task 1 pictures"},
            {"reason": "Cần UI nhóm từ", "item": "Vocabulary Task 3"},
            {"reason": "Câu hỏi mở", "item": "Speaking Task 2"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "scramble": [
            {"word": w, "hint": "U2 Home"}
            for w in ["bedroom", "kitchen", "bathroom", "wardrobe", "fridge", "dishwasher", "apartment", "cupboard", "microwave", "garage"]
        ],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": ipa, "hint": "U2"}
            for e, k, t, ipa in [
                ("Âm /s/", "S", "shops", "/ʃɒps/"),
                ("Âm /s/", "S", "books", "/bʊks/"),
                ("Âm /z/", "Z", "schools", "/skuːlz/"),
                ("Âm /z/", "Z", "dogs", "/dɒɡz/"),
                ("Âm /ɪz/", "IZ", "watches", "/ˈwɒtʃɪz/"),
                ("Âm /ɪz/", "IZ", "beaches", "/ˈbiːtʃɪz/"),
                ("Âm /ɪz/", "IZ", "boxes", "/ˈbɒksɪz/"),
                ("Âm /z/", "Z", "chairs", "/tʃeəz/"),
            ]
        ],
        "read_and_complete": [
            {
                "title": "U2 Vocabulary — Parts of the house passage",
                "instruction": "Complete the sentences with words from the box.",
                "word_bank": ["bedrooms", "bathroom", "kitchen", "dining room", "living room", "garage", "garden", "attic"],
                "items": [
                    {"order": 1, "sentence": "It has got two ___ upstairs, my parents' one and mine.", "image": "", "answer": "bedrooms"},
                    {"order": 2, "sentence": "Upstairs also there is a ___ where I wash and brush my teeth.", "image": "", "answer": "bathroom"},
                    {"order": 3, "sentence": "Downstairs there is a ___ where my mother cooks.", "image": "", "answer": "kitchen"},
                    {"order": 4, "sentence": "There is a ___ to eat altogether.", "image": "", "answer": "dining room"},
                    {"order": 5, "sentence": "There is a ___ where we watch TV or sit and relax.", "image": "", "answer": "living room"},
                    {"order": 6, "sentence": "My parents park their cars in the ___.", "image": "", "answer": "garage"},
                    {"order": 7, "sentence": "We have a beautiful ___ with flowers and trees.", "image": "", "answer": "garden"},
                    {"order": 8, "sentence": "My house also has an ___ where we store old things.", "image": "", "answer": "attic"},
                ],
            }
        ],
        "speakingTopic": {"title": "Chat about my home", "durationSeconds": 300},
    }


def unit3():
    ex_odd = "U3 Pronunciation — Odd one out"
    ex_wf = "U3 Word form"
    quiz = [
        odd(ex_odd, ["best", "part", "pie", "pen"], "best"),
        odd(ex_odd, ["bow", "pie", "back", "baby"], "pie"),
        odd(ex_odd, ["copy", "happy", "beast", "pull"], "beast"),
        odd(ex_odd, ["bed", "job", "pass", "bull"], "pass"),
        odd(ex_odd, ["ban", "pet", "peach", "pier"], "ban"),
        odd(ex_odd, ["bat", "beer", "bye", "prize"], "prize"),
        odd(ex_odd, ["pig", "chubby", "pin", "pole"], "chubby"),
        odd(ex_odd, ["better", "bobby", "birthday", "provide"], "provide"),
        odd(ex_odd, ["pencil", "pocket", "boy", "postcard"], "boy"),
        odd(ex_odd, ["about", "professional", "beautiful", "butterfly"], "about"),
        fill("U3 Vocabulary — Adjectives", "He's a little bit ________. He likes to talk a lot.", "talkative"),
        fill("U3 Vocabulary — Adjectives", "She always has a ________ smile with everyone.", "friendly"),
        fill("U3 Vocabulary — Adjectives", "Everyone is ________ to me. They often help me.", "kind"),
        fill("U3 Vocabulary — Adjectives", "It is ________ to sit on the plane with nothing to read.", "boring"),
        fill("U3 Vocabulary — Adjectives", "She is very ________. She writes poetry and paints.", "creative"),
        fill("U3 Vocabulary — Adjectives", "It's a really ________ film; everyone laughs a lot.", "funny"),
        fill("U3 Vocabulary — Adjectives", "Children are often ________ at school and he always gets good marks.", "hard-working", ["hard-working", "hardworking", "clever"]),
        fill("U3 Vocabulary — Adjectives", "He is often ________ of people they don't know.", "shy"),
        fill("U3 Vocabulary — Adjectives", "The teacher wants students to feel ________ about asking questions.", "confident"),
        fill("U3 Vocabulary — Adjectives", "I'm not very ________ at Math.", "clever", ["clever", "good"]),
        wf(ex_wf, "It's nice meeting such a ________ person. (FRIEND)", "friendly"),
        wf(ex_wf, "Lan is very ________. She's always on the phone. (TALK)", "talkative"),
        wf(ex_wf, "Huy is very ________. (DEPEND)", "independent"),
        wf(ex_wf, "I think Jane is very ________. (SENSE)", "sensitive"),
        wf(ex_wf, "Viet is very ________. He always has new ideas. (CREATE)", "creative"),
        wf(ex_wf, "You must be ________ when you open that door. (CARE)", "careful"),
        wf(ex_wf, "I think you look very ________ in that hat. (FUN)", "funny"),
        wf(ex_wf, "Tom is the most ________ person I've ever met. (BORE)", "boring"),
        wf(ex_wf, "I'm ________ about the book she's writing. (CURIOSITY)", "curious"),
        wf(ex_wf, "You can trust John. He is very ________. (RELY)", "reliable"),
        wf(ex_wf, "She takes an ________ part in school life. (ACTIVATE)", "active"),
        wf(ex_wf, "She's completely lacking in ________. (CONFIDE)", "confidence"),
        wf(ex_wf, "People in my country are very warm and ________. (FRIEND)", "friendly"),
        mc("U3 Reading — Dialogue", "Maya is incredibly kind and imaginative — which word fits the paraphrase cue (creative)?", "creative", ["creative", "shy", "lazy", "rude"], "Paraphrase cue"),
        mc("U3 Reading — Dialogue", "Lucas always gets the answers right — cue (clever).", "clever", ["clever", "boring", "rude", "shy"], "Paraphrase cue"),
    ]
    cc = [
        {
            "title": "U3 Vocabulary — Circle the right adjective",
            "instruction": "Circle the correct adjective.",
            "items": [
                {"order": 1, "image": "", "prompt": "Donata has a lot of friends.", "options": ["friendly", "rude"], "answer": "friendly"},
                {"order": 2, "image": "", "prompt": "Mona always has new ideas.", "options": ["reliable", "creative"], "answer": "creative"},
                {"order": 3, "image": "", "prompt": "Ann never has anything interesting to say.", "options": ["interesting", "boring"], "answer": "boring"},
                {"order": 4, "image": "", "prompt": "Jully likes telling jokes.", "options": ["funny", "shy"], "answer": "funny"},
                {"order": 5, "image": "", "prompt": "Anna cries quickly when watching romance movies.", "options": ["serious", "sensitive"], "answer": "sensitive"},
                {"order": 6, "image": "", "prompt": "Lucy likes meeting and talking to people.", "options": ["outgoing", "generous"], "answer": "outgoing"},
                {"order": 7, "image": "", "prompt": "Joana never helps with the housework.", "options": ["hard-working", "lazy"], "answer": "lazy"},
                {"order": 8, "image": "", "prompt": "Jane becomes annoyed if she has to wait.", "options": ["nervous", "impatient"], "answer": "impatient"},
                {"order": 9, "image": "", "prompt": "Mathew likes to play sport.", "options": ["active", "helpful"], "answer": "active"},
                {"order": 10, "image": "", "prompt": "Helen isn't very talkative.", "options": ["quiet", "curious"], "answer": "quiet"},
            ],
        }
    ]
    hr = "U3 Writing — Reorder the words"
    grammar = [
        gr(hr, "eyes/ sister/ my/ is/ she/ younger/ and/ short/ has/ round.", ["She is my younger sister and has short round eyes.", "She is my younger sister and she has short round eyes."]),
        gr(hr, "hard-working/ Lam/ is/ student/ class/ intelligent/ in/ an/ my/ and.", ["Lam is an intelligent and hard-working student in my class.", "Lam is a hard-working and intelligent student in my class."]),
        gr(hr, "her/ Jane/ Paris/ is/ next/ mother/ to/ travelling/ with/ Friday.", ["Jane is travelling to Paris with her mother next Friday.", "Jane is traveling to Paris with her mother next Friday."]),
        gr(hr, "National Cinema/ we/ Saturday/ are/ to/ the/ going/ this.", ["We are going to the National Cinema this Saturday.", "We are going to the National Cinema this Saturday"]),
        gr(hr, "camping/ is/ next/ my/ class/ in/ weekend/ Cuc Phuong forest/ going.", ["My class is going camping in Cuc Phuong forest next weekend.", "My class is going camping in Cuc Phuong forest next weekend"]),
        gr("U3 Writing — Rewrite", "Maya is incredibly kind and has a great imagination for making new things. (creative)", ["Maya is very creative.", "Maya is incredibly creative."], "Maya is", "."),
        gr("U3 Writing — Rewrite", "Lucas is an exceptionally smart student who always gets the answers right. (clever)", ["Lucas is a clever student.", "Lucas is very clever."], "Lucas is", "."),
    ]
    return {
        "unit": 3,
        "title": "My Friends",
        "source": "PDF/GRADE 6 GLOBAL SUCCESS FINAL.pdf (pages 31–43)",
        "skipped": [
            {"reason": "Cần UI cột /b/ /p/", "item": "Pronunciation Task 1"},
            {"reason": "Crossword thân người khó parse", "item": "Vocabulary Task 1 body parts"},
            {"reason": "Câu hỏi mở", "item": "Speaking Task 2"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "choose_and_circle": cc,
        "scramble": [{"word": w, "hint": "U3 Friends"} for w in ["friendly", "creative", "talkative", "confident", "curious", "reliable", "sensitive", "outgoing", "impatient", "hardworking"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U3"}
            for e, k, t in [
                ("Âm /b/", "B", "back"),
                ("Âm /b/", "B", "big"),
                ("Âm /b/", "B", "blonde"),
                ("Âm /p/", "P", "pen"),
                ("Âm /p/", "P", "picnic"),
                ("Âm /p/", "P", "parents"),
                ("Âm /p/", "P", "picture"),
                ("Âm /b/", "B", "biscuit"),
            ]
        ],
        "speakingTopic": {"title": "Chat about my friends", "durationSeconds": 300},
    }


def unit4():
    ex_odd = "U4 Pronunciation — Odd one out"
    ex_wf = "U4 Word form"
    quiz = [
        # odd ones - need extract; use common patterns from page start - I'll use definition vocab instead if odd unclear
        fill("U4 Vocabulary — Places", "A shop that sells medicines and drugs → ________", "pharmacy"),
        fill("U4 Vocabulary — Places", "A large shop divided into several parts → ________", "department store", ["department store", "departmentstore"]),
        fill("U4 Vocabulary — Places", "A place where you can get your hair cut → ________", "hairdresser's", ["hairdresser's", "hairdresser", "hairdressers"]),
        fill("U4 Vocabulary — Places", "A building for a fire brigade → ________", "fire station", ["fire station", "firestation"]),
        fill("U4 Vocabulary — Places", "A place where doctors see patients → ________", "health centre", ["health centre", "health center", "clinic"]),
        fill("U4 Vocabulary — Places", "A place beside the road to buy petrol → ________", "petrol station", ["petrol station", "gas station"]),
        fill("U4 Vocabulary — Places", "An area of land for burying dead people → ________", "cemetery"),
        wf(ex_wf, "It is a great ________ to have the school so near. (CONVENIENT)", "convenience"),
        wf(ex_wf, "In the spring the place is ________ with skiers. (CROWD)", "crowded"),
        wf(ex_wf, "I still find the job ________. (EXCITE)", "exciting"),
        wf(ex_wf, "The area is of special ________ interest. (HISTORY)", "historical", ["historical", "historic"]),
        wf(ex_wf, "________ on British beaches is a serious problem. (POLLUTE)", "Pollution"),
        wf(ex_wf, "Ha Noi is a ________ capital. (FAME)", "famous"),
        wf(ex_wf, "He bought a new car in order to move ________ in a big city. (CONVENIENT)", "conveniently"),
        wf(ex_wf, "The environment in our city is ________. (POLLUTE)", "polluted"),
        wf(ex_wf, "I like enjoying clean air and ________ in the countryside. (PEACE)", "peace"),
        wf(ex_wf, "Don't go straight ahead. It's very ________. (DANGER)", "dangerous"),
        wf(ex_wf, "My neighborhood is ________ for good restaurants. (FAME)", "famous"),
        wf(ex_wf, "She's beautiful with a ________ smile. (LOVE)", "lovely"),
        wf(ex_wf, "________, the barber cut my hair too short. (LUCK)", "Unfortunately", ["Unfortunately", "Unluckily"]),
        wf(ex_wf, "Each of my friends has a ________ character. (DIFFER)", "different"),
        fill("U4 Grammar — Comparative forms", "fast → ________", "faster"),
        fill("U4 Grammar — Comparative forms", "thin → ________", "thinner"),
        fill("U4 Grammar — Comparative forms", "good → ________", "better"),
        fill("U4 Grammar — Comparative forms", "happy → ________", "happier"),
        fill("U4 Grammar — Comparative forms", "carefully → ________", "more carefully"),
        fill("U4 Grammar — Comparative forms", "attractive → ________", "more attractive"),
        fill("U4 Grammar — Comparative forms", "noisy → ________", "noisier"),
        fill("U4 Grammar — Comparative forms", "interesting → ________", "more interesting"),
        fill("U4 Grammar — Comparative forms", "polluted → ________", "more polluted"),
        fill("U4 Grammar — Comparative forms", "cheap → ________", "cheaper"),
        mc("U4 Speaking — Match", "Excuse me! Is there a grocery store near here?", "Turn at the next corner. Go straight on to the traffic lights. Turn left. It's on your right", ["Turn at the next corner. Go straight on to the traffic lights. Turn left. It's on your right", "Yes, please.", "I'm fine, thanks.", "See you later."], "Speaking match"),
    ]
    hc = "U4 Grammar — Comparatives"
    grammar = [
        gr(hc, "I am ________ than my sister. (tall)", ["taller"], "I am", "than my sister."),
        gr(hc, "My mum thinks that cats are ________ pets than dogs. (good)", ["better"], "My mum thinks that cats are", "pets than dogs."),
        gr(hc, "He is ________ than his brother. (intelligent)", ["more intelligent"], "He is", "than his brother."),
        gr(hc, "A swordfish is ________ than a jellyfish. (fast)", ["faster"], "A swordfish is", "than a jellyfish."),
        gr(hc, "You look ________ than last month. (thin)", ["thinner"], "You look", "than last month."),
        gr(hc, "A new house is ________ than an old one. (expensive)", ["more expensive"], "A new house is", "than an old one."),
        gr(hc, "Irene is ________ than Silvia. (clever)", ["cleverer", "more clever"], "Irene is", "than Silvia."),
        gr(hc, "Computers are ________ than mobile phones. (cheap)", ["cheaper"], "Computers are", "than mobile phones."),
        gr(hc, "She looks even ________ last week. (bad)", ["worse than"], "She looks even", "last week."),
        gr(hc, "Her job is a lot ________ mine. (stressful)", ["more stressful than"], "Her job is a lot", "mine."),
        gr(hc, "I like this school because it is ________ the other one. (big)", ["bigger than"], "I like this school because it is", "the other one."),
        gr(hc, "A car is much ________ a bike. (expensive)", ["more expensive than"], "A car is much", "a bike."),
        gr("U4 Writing — Comparatives", "Sam is younger than Tim.", ["Sam is younger than Tim.", "Sam is younger than Tim"]),
        gr("U4 Writing — Comparatives", "(be/ hot) Sapa / Nha Trang", ["Sapa is hotter than Nha Trang.", "Nha Trang is hotter than Sapa."]),
        gr("U4 Writing — Comparatives", "(be/ big) The mouse / the elephant", ["The elephant is bigger than the mouse.", "The elephant is bigger than the mouse"]),
    ]
    return {
        "unit": 4,
        "title": "My Neighbourhood",
        "source": "PDF/GRADE 6 GLOBAL SUCCESS FINAL.pdf (pages 44–56)",
        "skipped": [
            {"reason": "Thiếu ảnh", "item": "Vocabulary Task 1 pictures"},
            {"reason": "Sắp xếp hội thoại khó map UI", "item": "Speaking Task 2 conversation order"},
            {"reason": "Reading matching features cần answer key kỹ hơn", "item": "Reading Exercise 1–3 partial"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "scramble": [{"word": w, "hint": "U4 Places"} for w in ["pharmacy", "museum", "pagoda", "suburb", "bakery", "cinema", "bookstore", "cemetery", "restaurant", "gallery"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": "Neighbourhood words", "exerciseKey": "N4", "targetText": t, "targetIpa": "", "hint": "U4"}
            for t in ["museum", "pagoda", "pharmacy", "suburb", "cinema", "bakery", "restaurant", "bookstore"]
        ],
        "speakingTopic": {"title": "Chat about my neighbourhood", "durationSeconds": 300},
    }


def unit5():
    ex_odd = "U5 Pronunciation — Odd one out"
    ex_wf = "U5 Word form"
    quiz = [
        odd(ex_odd, ["top", "stay", "ten", "tomato"], "stay"),
        odd(ex_odd, ["tune", "stop", "stick", "sticker"], "tune"),
        odd(ex_odd, ["pretty", "potato", "test", "steer"], "pretty"),
        odd(ex_odd, ["state", "tip", "statement", "station"], "tip"),
        odd(ex_odd, ["lost", "tennis", "photo", "telephone"], "lost"),
        odd(ex_odd, ["stand", "stamps", "steal", "tape"], "tape"),
        odd(ex_odd, ["toy", "just", "tea", "tight"], "just"),
        odd(ex_odd, ["stole", "stolen", "stuff", "script"], "script"),
        odd(ex_odd, ["beast", "button", "time", "ticket"], "beast"),
        odd(ex_odd, ["staff", "style", "total", "stone"], "total"),
        fill("U5 Vocabulary — Natural wonders", "A large dry area with almost no water or plants → ________", "desert"),
        fill("U5 Vocabulary — Natural wonders", "A large area of water that flows to the sea → ________", "river"),
        fill("U5 Vocabulary — Natural wonders", "A large area of water surrounded by land → ________", "lake"),
        fill("U5 Vocabulary — Natural wonders", "Land completely surrounded by water → ________", "island"),
        fill("U5 Vocabulary — Natural wonders", "Where a river falls from a high place → ________", "waterfall", ["waterfall", "water fall"]),
        fill("U5 Vocabulary — Natural wonders", "Land covered with many trees → ________", "forest"),
        fill("U5 Vocabulary — Natural wonders", "Low land between mountains → ________", "valley"),
        fill("U5 Vocabulary — Natural wonders", "A large hole in a hill or underground → ________", "cave"),
        fill("U5 Vocabulary — Phrases", "swim in the ________", "river"),
        fill("U5 Vocabulary — Phrases", "explore the ________", "cave"),
        fill("U5 Vocabulary — Phrases", "sleep in a ________", "sleeping bag", ["sleeping bag", "tent"]),
        fill("U5 Vocabulary — Phrases", "set up a ________", "tent"),
        fill("U5 Vocabulary — Phrases", "climb up the ________", "mountain"),
        fill("U5 Vocabulary — Phrases", "wear a ________", "sun hat", ["sun hat", "sunhat"]),
        fill("U5 Vocabulary — Phrases", "call with a ________", "mobile phone", ["mobile phone", "phone"]),
        wf(ex_wf, "A trip to Fan Si Pan is an ________ experience. (FORGET)", "unforgettable"),
        wf(ex_wf, "You can watch ________ when you visit Sa Pa. (TRADITION)", "traditions", ["traditions", "traditional dances", "traditional"]),
        wf(ex_wf, "The greatest ________ in Hue is temples. (ATTRACT)", "attraction"),
        wf(ex_wf, "It's ________ in Mui Ne at this time of year. (RAIN)", "rainy"),
        wf(ex_wf, "Hue is more ________ than Da Nang. (INTEREST)", "interesting"),
        wf(ex_wf, "The Perfume River is the most ________ river in Central Viet Nam. (FAME)", "famous"),
        wf(ex_wf, "You can join many exciting ________ during the festival. (ACT)", "activities"),
        wf(ex_wf, "Nam's brother is a ________. (PHOTOGRAPH)", "photographer"),
        wf(ex_wf, "I'd like some ________ about the cruise. (INFORM)", "information"),
        wf(ex_wf, "The enormous ________ of life on earth. (DIVERSE)", "diversity"),
        wf(ex_wf, "He's been ________ for the past six months. (JOB)", "jobless", ["jobless", "unemployed"]),
        wf(ex_wf, "Is Quang Ninh a ________ province? (MOUNTAIN)", "mountainous"),
        mc("U5 Grammar — Mistake", "How many orange juice have you had today? → Correct ________", "How much orange juice have you had today?", ["How much orange juice have you had today?", "How many orange juices have you had today?", "How many orange juice you had today?", "How much oranges juice have you had today?"], "Correct the mistake"),
        mc("U5 Grammar — Mistake", "Are there some eggs in the fridge? → Correct ________", "Are there any eggs in the fridge?", ["Are there any eggs in the fridge?", "Is there some eggs in the fridge?", "Are there some egg in the fridge?", "There are any eggs in the fridge?"], "Correct the mistake"),
    ]
    hm = "U5 Grammar — must/mustn't"
    ha = "U5 Grammar — a/an/some/any"
    hh = "U5 Grammar — How much/How many"
    grammar = [
        gr(hm, "She is ill, so she ________ see the doctor.", ["must"], "She is ill, so she", "see the doctor."),
        gr(hm, "It is raining. You ________ take your umbrella.", ["must"], "It is raining. You", "take your umbrella."),
        gr(hm, "You ________ throw litter on the stairs.", ["mustn't", "must not"], "You", "throw litter on the stairs."),
        gr(hm, "This is a secret. You ________ tell anybody.", ["mustn't", "must not"], "This is a secret. You", "tell anybody."),
        gr(hm, "You ________ make noise in the library.", ["mustn't", "must not"], "You", "make noise in the library."),
        gr(hm, "We ________ hurry or we will miss the bus.", ["must"], "We", "hurry or we will miss the bus."),
        gr(hm, "The baby is sleeping. You ________ shout.", ["mustn't", "must not"], "The baby is sleeping. You", "shout."),
        gr(hm, "You ________ light fires in the forest.", ["mustn't", "must not"], "You", "light fires in the forest."),
        gr(hm, "Jane is not feeling well. (she/ go to the doctor)", ["She must go to the doctor.", "She must go to the doctor"]),
        gr(hm, "This is a secret. (you/ tell the others)", ["You mustn't tell the others.", "You must not tell the others."]),
        gr(ha, "Have you got ________ potatoes?", ["any"], "Have you got", "potatoes?"),
        gr(ha, "I'd like ________ bread, please.", ["some"], "I'd like", "bread, please."),
        gr(ha, "Here are ________ cereals, but there isn't ________ milk.", ["some / any", "some, any"], "Here are", "cereals, but there isn't milk."),
        gr(hh, "________ grams of sugar per day should we consume?", ["How many"], "", "grams of sugar per day should we consume?"),
        gr(hh, "________ bread do we need?", ["How much"], "", "bread do we need?"),
        gr(hh, "________ coffee do you drink in a day?", ["How much"], "", "coffee do you drink in a day?"),
        gr(hh, "________ steaks do you want?", ["How many"], "", "steaks do you want?"),
        gr(hh, "________ bottles of orange juice have you had today?", ["How many"], "", "bottles of orange juice have you had today?"),
        gr("U5 Writing — Reorder the words", "must/ We/ protect/ natural/ wonders/ our/.", ["We must protect our natural wonders.", "We must protect our natural wonders"]),
        gr("U5 Writing — Reorder the words", "mustn't/ You/ litter/ throw/ the/ forest/ in/.", ["You mustn't throw litter in the forest.", "You must not throw litter in the forest."]),
    ]
    return {
        "unit": 5,
        "title": "Natural Wonders Of Viet Nam",
        "source": "PDF/GRADE 6 GLOBAL SUCCESS FINAL.pdf (pages 57–70)",
        "skipped": [
            {"reason": "Cột âm /t/ /d/", "item": "Pronunciation Task 1"},
            {"reason": "Reading/summary cần audio/passage map kỹ hơn", "item": "Reading Exercise 1–3 partial"},
            {"reason": "Câu hỏi mở", "item": "Speaking Task 2"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "scramble": [{"word": w, "hint": "U5 Wonders"} for w in ["desert", "river", "island", "waterfall", "forest", "valley", "cave", "mountain", "tent", "compass"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U5"}
            for e, k, t in [
                ("Âm /t/", "T", "ticket"),
                ("Âm /t/", "T", "tent"),
                ("Âm /t/", "T", "hot"),
                ("Âm /d/", "D", "desert"),
                ("Âm /d/", "D", "island"),
                ("Âm /d/", "D", "modern"),
                ("Âm /d/", "D", "wonder"),
                ("Âm /t/", "T", "boat"),
            ]
        ],
        "speakingTopic": {"title": "Chat about natural wonders of Viet Nam", "durationSeconds": 300},
    }


def unit6():
    ex_odd = "U6 Pronunciation — Odd one out"
    ex_wf = "U6 Word form"
    quiz = [
        odd(ex_odd, ["tension", "sound", "nation", "potential"], "sound"),
        odd(ex_odd, ["seek", "sand", "sleep", "special"], "special"),
        odd(ex_odd, ["soon", "ambitious", "machine", "shake"], "soon"),
        odd(ex_odd, ["center", "social", "soap", "suck"], "center"),
        odd(ex_odd, ["price", "shampoo", "sharp", "push"], "price"),
        odd(ex_odd, ["soccer", "sorry", "see", "ancient"], "ancient"),
        odd(ex_odd, ["mushroom", "sugar", "recycle", "shrimp"], "recycle"),
        odd(ex_odd, ["speak", "ensure", "miss", "support"], "ensure"),
        odd(ex_odd, ["social", "saw", "shop", "city"], "city"),
        odd(ex_odd, ["pressure", "precise", "space", "sound"], "pressure"),
        fill("U6 Vocabulary — Tet", "The Vietnamese ________ Tet in late January or early February.", "celebrate"),
        fill("U6 Vocabulary — Tet", "Children ________ their grandparents health and longevity.", "wish"),
        fill("U6 Vocabulary — Tet", "Tet is a time for family ________.", "gatherings", ["gatherings", "reunion", "reunions"]),
        fill("U6 Vocabulary — Tet", "Thousands of people gathered to ________ fireworks.", "watch", ["watch", "see"]),
        fill("U6 Vocabulary — Tet", "Children receive ________ money in red envelopes.", "lucky"),
        fill("U6 Vocabulary — Tet", "They believe that the first ________ on New Year's Day decides the family luck.", "visitor", ["visitor", "guest"]),
        fill("U6 Vocabulary — Tet", "New Year's ________ is on December 31.", "Eve", ["Eve", "eve"]),
        fill("U6 Vocabulary — Tet", "We ________ our house with flowers and plants.", "decorate"),
        fill("U6 Vocabulary — Tet", "One tradition in Thai New Year is to throw ________ over people.", "water"),
        fill("U6 Vocabulary — Tet", "Children ________ eat lots of sweets - it's not good for their teeth.", "shouldn't", ["shouldn't", "should not"]),
        wf(ex_wf, "I always visit my ________ during Tet holiday. (RELATION)", "relatives"),
        wf(ex_wf, "Tet is a special occasion for family ________. (GATHER)", "gatherings", ["gatherings", "gathering"]),
        wf(ex_wf, "We cleaned the house to ________ Tet. (CELEBRATION)", "celebrate"),
        wf(ex_wf, "________, children will receive lucky money. (TRADITION)", "Traditionally"),
        wf(ex_wf, "We pray for good health, ________ and wealth. (HAPPY)", "happiness"),
        wf(ex_wf, "We can have a ________ if we eat too many sweets. (TOOTH)", "toothache"),
        wf(ex_wf, "It's so ________ to have a spring vacation in Sa Pa. (FANTASY)", "fantastic"),
        mc("U6 Grammar — should/shouldn't", "Children (should/ shouldn't) listen to their parents.", "should", ["should", "shouldn't"], "Underline correct"),
        mc("U6 Grammar — should/shouldn't", "The students (should/ shouldn't) use their mobile phone in the exam.", "shouldn't", ["should", "shouldn't"], "Underline correct"),
        mc("U6 Grammar — Modal", "All students ________ study hard to get good results. (shall, can, must)", "must", ["shall", "can", "must"], "Choose modal"),
        mc("U6 Grammar — Modal", "You ________ never speak to your mother like this. (should, mustn't, shouldn't)", "should", ["should", "mustn't", "shouldn't"], "Choose modal"),
    ]
    hs = "U6 Grammar — should/shouldn't"
    hv = "U6 Grammar — Verbs for Tet"
    grammar = [
        gr(hv, "We ________ the house before Tet. (clean/decorate)", ["clean", "decorate"], "We", "the house before Tet."),
        gr(hv, "Children ________ lucky money. (receive/give)", ["receive"], "Children", "lucky money."),
        gr(hv, "Families ________ Banh Chung. (make/cook)", ["make", "cook"], "Families", "Banh Chung."),
        gr(hv, "People ________ guests during Tet. (welcome/fight)", ["welcome"], "People", "guests during Tet."),
        gr(hs, "You ________ eat too many sweets.", ["shouldn't", "should not"], "You", "eat too many sweets."),
        gr(hs, "You ________ visit your grandparents.", ["should"], "You", "visit your grandparents."),
        gr(hs, "You ________ break things in the house.", ["shouldn't", "should not"], "You", "break things in the house."),
        gr(hs, "You ________ behave well at Tet.", ["should"], "You", "behave well at Tet."),
        gr("U6 Writing — Reorder the words", "lucky/ Children/ money/ receive/ envelopes/ in/ red/.", ["Children receive lucky money in red envelopes.", "Children receive lucky money in red envelopes"]),
        gr("U6 Writing — Reorder the words", "Tet/ for/ is/ time/ a/ family/ gatherings/.", ["Tet is a time for family gatherings.", "Tet is a time for family gatherings"]),
        gr("U6 Writing — Reorder the words", "should/ We/ the/ decorate/ house/ flowers/ with/.", ["We should decorate the house with flowers.", "We should decorate the house with flowers"]),
        gr("U6 Writing — Reorder the words", "shouldn't/ You/ things/ break/ Tet/ during/.", ["You shouldn't break things during Tet.", "You should not break things during Tet."]),
    ]
    rac = [
        {
            "title": "U6 Vocabulary — Should / shouldn't at Tet",
            "instruction": "Complete with activities you should or shouldn't do (use the bank).",
            "word_bank": ["welcome guests", "decorate the house", "visit relatives", "break things", "fight", "behave well"],
            "items": [
                {"order": 1, "sentence": "At Tet you should ___.", "image": "", "answer": "welcome guests"},
                {"order": 2, "sentence": "You should ___ with flowers.", "image": "", "answer": "decorate the house"},
                {"order": 3, "sentence": "You should ___.", "image": "", "answer": "visit relatives"},
                {"order": 4, "sentence": "You shouldn't ___.", "image": "", "answer": "break things"},
                {"order": 5, "sentence": "You shouldn't ___.", "image": "", "answer": "fight"},
                {"order": 6, "sentence": "You should ___.", "image": "", "answer": "behave well"},
            ],
        }
    ]
    return {
        "unit": 6,
        "title": "Our Tet Holiday",
        "source": "PDF/GRADE 6 GLOBAL SUCCESS FINAL.pdf (pages 71–85)",
        "skipped": [
            {"reason": "Cột /s/ /ʃ/", "item": "Pronunciation Task 1"},
            {"reason": "Cột Things/Places/Food/People", "item": "Vocabulary Task 1"},
            {"reason": "Reading table completion cần passage kỹ hơn", "item": "Reading Exercise 1–2 partial"},
            {"reason": "Câu hỏi mở", "item": "Speaking Task 2"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "read_and_complete": rac,
        "scramble": [{"word": w, "hint": "U6 Tet"} for w in ["celebrate", "fireworks", "relatives", "decorate", "blossom", "pagoda", "envelope", "reunion", "tradition", "festival"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U6"}
            for e, k, t in [
                ("Âm /s/", "S", "summer"),
                ("Âm /s/", "S", "celebrate"),
                ("Âm /ʃ/", "SH", "wish"),
                ("Âm /ʃ/", "SH", "special"),
                ("Âm /ʃ/", "SH", "shopping"),
                ("Âm /ʃ/", "SH", "sugar"),
                ("Âm /s/", "S", "spring"),
                ("Âm /ʃ/", "SH", "shine"),
            ]
        ],
        "speakingTopic": {"title": "Chat about Tet holiday", "durationSeconds": 300},
    }


if __name__ == "__main__":
    for builder in (unit2, unit3, unit4, unit5, unit6):
        dump(builder())
