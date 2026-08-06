#!/usr/bin/env python3
"""Generate lop7-unit{1-6}-content.json (same conventions as Lớp 6)."""

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
        f"Choose the word that has the underlined part pronounced differently: {labeled}",
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
    path = OUT / f"lop7-unit{unit['unit']}-content.json"
    path.write_text(json.dumps(unit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"U{unit['unit']}: quiz={len(unit['quiz'])} grammar={len(unit['grammar'])} "
        f"scramble={len(unit['scramble'])} pron={len(unit['pronunciation'])} "
        f"rac={len(unit.get('read_and_complete') or [])}"
    )


def unit1():
    eo = "U1 Pronunciation — Odd one out"
    ev = "U1 Vocabulary — Hobbies MC"
    er = "U1 Reading — Mary's hobby"
    cloze = "U1 Reading — Cloze"
    ew = "U1 Word form"
    quiz = [
        odd(eo, ["pottery", "flower", "silent", "service"], "silent"),
        odd(eo, ["girl", "expert", "open", "burn"], "open"),
        odd(eo, ["sentence", "world", "picture", "dangerous"], "world"),
        odd(eo, ["surfing", "collect", "concert", "melody"], "collect"),
        odd(eo, ["worst", "learn", "control", "dessert"], "control"),
        mc(ev, "My friend ______ football at weekends.", "plays", ["does", "takes", "makes", "plays"]),
        mc(ev, "Jane and Minh love collecting ______.", "stamps", ["stamps", "dolls", "glass bottles", "bears"]),
        mc(ev, "My hobby is ______ photos.", "taking", ["making", "doing", "carving", "taking"]),
        mc(ev, "I think ______ coin is very interesting.", "collecting", ["collecting", "cycling", "ice-skating", "doing gymnastics"]),
        mc(ev, "When I have free time, I usually go ______.", "camping", ["surfing", "swimming", "fishing", "camping"]),
        mc("U1 Speaking — Match verbs", "collect →", "coins", ["television", "books", "coins", "pop music"]),
        mc("U1 Speaking — Match verbs", "take →", "photos", ["television", "coins", "photos", "yoga"]),
        mc("U1 Speaking — Match verbs", "watch →", "television", ["television", "coins", "photos", "pottery"]),
        mc("U1 Speaking — Match verbs", "play →", "the piano", ["television", "the piano", "photos", "sightseeing"]),
        mc("U1 Speaking — Match verbs", "listen to →", "pop music", ["television", "pop music", "photos", "yoga"]),
        mc("U1 Speaking — Match verbs", "go →", "sightseeing", ["television", "coins", "photos", "sightseeing"]),
        mc(er, "When did Mary start her hobby?", "at the age of 8", ["8 years ago", "at the age of 8", "in grade 8", "one year ago"]),
        mc(er, "What does Mary think about cooking?", "Both B & c are correct.", ["She thinks it's a waste of time.", "She finds it interesting.", "She finds it meaningful.", "Both B & c are correct."]),
        mc(er, 'What does the word "them" refer to?', "recipes", ["Mary", "Mary's mother and grandmother", "recipes", "Mary's dishes"]),
        mc(er, "Where does Mary get recipes from?", "All are correct.", ["from her mother", "from her grandmother", "from the Internet", "All are correct."]),
        mc(er, "What does Mary do with the recipes?", "She keeps them in a notebook.", ["She keeps them in a notebook.", "She shares them with her mother and grandmother.", "She posts them on the Internet.", "All are correct."]),
        mc(cloze, "What do you like doing best ______ your spare time?", "in", ["for", "when", "in", "at"]),
        mc(cloze, "Henry likes going ______ in the country and taking photos.", "for walks", ["for walks", "walks", "a walk", "to walk"]),
        mc(cloze, "…and ______ photos.", "taking", ["making", "having", "taking", "doing"]),
        mc(cloze, "Sometimes he ______ with his friends…", "goes out", ["travels", "gets up", "sees", "goes out"]),
        mc(cloze, "His brother Chris isn't ______ on walking.", "keen", ["interested", "out", "decided", "keen"]),
        wf(ew, "My ______ hobby is collecting stamps. (FAVOUR)", "favourite", ["favourite", "favorite"]),
        wf(ew, "She is a very ______ girl. (CREATE)", "creative"),
        wf(ew, "Collecting coins is an ______ hobby. (INTEREST)", "interesting"),
        wf(ew, "He is a stamp ______. (COLLECT)", "collector"),
        wf(ew, "Photography is her greatest ______. (ENJOY)", "enjoyment"),
    ]
    hp = "U1 Grammar — Present simple"
    hl = "U1 Grammar — Verbs of liking (to V / V-ing)"
    hr = "U1 Writing — Reorder the words"
    hw = "U1 Writing — Rewrite"
    grammar = [
        gr(hp, "______ the film begin at 3.30 or 4.30?", ["Does"], "", "the film begin at 3.30 or 4.30?"),
        gr(hp, "The art exhibition ______ on 3rd May.", ["opens"], "The art exhibition", "on 3rd May."),
        gr(hp, "The train ______ Plymouth at 11.30.", ["leaves"], "The train", "Plymouth at 11.30."),
        gr(hp, "We ______ our work on Monday.", ["start"], "We", "our work on Monday."),
        gr(hp, "When ______ it finish?", ["does"], "When", "it finish?"),
        gr(hp, "What time ______ your train leave tomorrow?", ["does"], "What time", "your train leave tomorrow?"),
        gr(hp, "Next Friday ______ the thirteenth.", ["is"], "Next Friday", "the thirteenth."),
        gr(hp, "My train ______ at 11.30.", ["leaves"], "My train", "at 11.30."),
        gr(hl, "Everyone likes ______ ice cream. (eat)", ["to eat", "eating"], "Everyone likes", "ice cream."),
        gr(hl, "Do you prefer ______ books in your free time? (read)", ["to read", "reading"], "Do you prefer", "books in your free time?"),
        gr(hl, "I hate ______ horror movies. (watch)", ["to watch", "watching"], "I hate", "horror movies."),
        gr(hl, "My father loves ______ golf with his friends. (play)", ["to play", "playing"], "My father loves", "golf with his friends."),
        gr(hl, "Do you fancy ______ out this evening? (go)", ["going"], "Do you fancy", "out this evening?"),
        gr(hl, "I like ______ tennis at the weekend. (play)", ["playing"], "I like", "tennis at the weekend."),
        gr(hl, "Jim enjoys ______ photos. (take)", ["taking"], "Jim enjoys", "photos."),
        gr(hl, "My niece loves ______ adventure books. (read)", ["reading"], "My niece loves", "adventure books."),
        gr(hl, "I can't stand ______ for buses in the rain. (wait)", ["waiting"], "I can't stand", "for buses in the rain."),
        gr("U1 Grammar — Prepositions", "Welcome ______ my house!", ["to"], "Welcome", "my house!"),
        gr("U1 Grammar — Prepositions", "Is there anything good ______ television tonight?", ["on"], "Is there anything good", "television tonight?"),
        gr("U1 Grammar — Prepositions", "What do you like doing ______ your free time?", ["in"], "What do you like doing", "your free time?"),
        gr("U1 Grammar — Prepositions", "He is interested ______ collecting toy cars.", ["in"], "He is interested", "collecting toy cars."),
        gr(hr, "hobbies/ you/ have/ any/ do/?", ["Do you have any hobbies?", "Do you have any hobbies"]),
        gr(hr, "his/ do/ what/ your/ brother/ free/ does/ in/ time/?", ["What does your brother do in his free time?", "What does your brother do in his free time"]),
        gr(hr, "he/ summer/ in/ climbing/ goes/ mountain/ the/ usually/.", ["He usually goes mountain climbing in the summer.", "He usually goes mountain climbing in the summer"]),
        gr(hr, "you/ up/ will/ ice-skating/ future/ in/ take/ the/?", ["Will you take up ice-skating in the future?", "Will you take up ice-skating in the future"]),
        gr(hw, "What is your hobby?", ["do you have", "are you interested in"], "What hobby", "?"),
        gr(hw, "His hobby is collecting toy cars.", ["toy cars", "toy cars as a hobby"], "He collects", "."),
        gr(hw, "My father likes to do gardening at the weekend.", ["gardening at the weekend", "doing gardening at the weekend"], "My father enjoys", "."),
        gr(hw, "Why don't we go swimming this afternoon?", ["going swimming this afternoon", "going swimming this afternoon?"], "What about", "?"),
    ]
    rac = [
        {
            "title": "U1 Reading — Collecting books",
            "instruction": "Complete the passage with words from the box.",
            "word_bank": ["kinds", "classify", "books", "near", "name", "collection", "clean", "immediately"],
            "items": [
                {"order": 1, "sentence": "Collecting ___ is my favourite hobby.", "image": "", "answer": "books"},
                {"order": 2, "sentence": "The first item in my ___ is a book about Doraemon.", "image": "", "answer": "collection"},
                {"order": 3, "sentence": "Now I have a lot of books of all ___.", "image": "", "answer": "kinds"},
                {"order": 4, "sentence": "Whenever I find an interesting book I buy it ___.", "image": "", "answer": "immediately"},
                {"order": 5, "sentence": "I usually buy books in the bookstores ___ my school.", "image": "", "answer": "near"},
                {"order": 6, "sentence": "I ___ my books into different categories.", "image": "", "answer": "classify"},
                {"order": 7, "sentence": "I put each category on the bookshelf with a ___ tag.", "image": "", "answer": "name"},
                {"order": 8, "sentence": "It takes time to keep everything ___ and dusted.", "image": "", "answer": "clean"},
            ],
        }
    ]
    return {
        "unit": 1,
        "title": "Hobbies",
        "source": "PDF/GRADE 7 HK1 (GS) FINAL.pdf (pages 1–15)",
        "skipped": [
            {"reason": "Cột âm /ə/ /ɜː/", "item": "Pronunciation grouping"},
            {"reason": "Match go/do/collect columns cần UI riêng", "item": "Match nouns with verbs columns"},
            {"reason": "Câu hỏi mở", "item": "Write questions for underlined parts"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "read_and_complete": rac,
        "scramble": [{"word": w, "hint": "U1 Hobbies"} for w in ["hobby", "collect", "stamp", "cycling", "camping", "pottery", "gardening", "surfing", "cartoon", "gymnastics"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U1"}
            for e, k, t in [
                ("Âm /ə/", "SCHWA", "banana"),
                ("Âm /ə/", "SCHWA", "mother"),
                ("Âm /ə/", "SCHWA", "doctor"),
                ("Âm /ɜː/", "NURSE", "girl"),
                ("Âm /ɜː/", "NURSE", "world"),
                ("Âm /ɜː/", "NURSE", "learn"),
                ("Âm /ɜː/", "NURSE", "shirt"),
                ("Âm /ɜː/", "NURSE", "word"),
            ]
        ],
        "speakingTopic": {"title": "Chat about hobbies", "durationSeconds": 300},
    }


def unit2():
    eo = "U2 Pronunciation — /f/ /v/ practice"
    quiz = [
        odd("U2 Pronunciation — Odd one out", ["of", "five", "leaf", "off"], "of"),
        odd("U2 Pronunciation — Odd one out", ["very", "view", "of", "van"], "of"),
        fill("U2 Vocabulary — Health", "You should ________ exercise regularly.", "do", ["do", "take"]),
        fill("U2 Vocabulary — Health", "I often ________ a cold in winter.", "have", ["have", "catch", "get"]),
        fill("U2 Vocabulary — Health", "She ________ tired after the long walk.", "felt", ["felt", "feels", "feel"]),
        fill("U2 Vocabulary — Health", "Eat more vegetables to stay ________.", "healthy", ["healthy", "fit"]),
        fill("U2 Vocabulary — Health", "Don't eat too much ________ food.", "junk", ["junk", "fast"]),
        fill("U2 Vocabulary — Health", "Wash your hands ________ meals.", "before", ["before", "after"]),
        fill("U2 Vocabulary — Prepositions", "I go to bed ________ 10 p.m.", "at"),
        fill("U2 Vocabulary — Prepositions", "She is good ________ swimming.", "at"),
        fill("U2 Vocabulary — Prepositions", "He recovered ________ his illness.", "from"),
        mc("U2 Reading — Cloze", "You should exercise ______ to stay healthy.", "regularly", ["regularly", "regular", "irregular", "irregularly"]),
        mc("U2 Reading — Cloze", "______ sports is good for your body.", "Playing", ["play", "do", "make", "Playing"]),
        mc("U2 Reading — Cloze", "Drink ______ water every day.", "a lot of", ["least", "most", "less", "a lot of"]),
        wf("U2 Word form", "Regular exercise keeps you ______. (HEALTH)", "healthy"),
        wf("U2 Word form", "This food is ______. (NATURE)", "natural"),
        wf("U2 Word form", "She recovered ______. (QUICK)", "quickly"),
        wf("U2 Word form", "Obesity can be ______. (DANGER)", "dangerous"),
        wf("U2 Word form", "We need a ______ diet. (BALANCE)", "balanced"),
        mc("U2 Speaking — Match", "How often do you exercise?", "Three times a week.", ["Three times a week.", "In the park.", "Because I'm tired.", "Yes, I do."]),
        mc("U2 Speaking — Match", "What's the matter with you?", "I have a headache.", ["I have a headache.", "I'm a student.", "At home.", "Football."]),
    ]
    hg = "U2 Grammar — have/feel"
    ht = "U2 Grammar — Verb tense"
    hw = "U2 Writing — Rewrite"
    grammar = [
        gr(hg, "I ______ a temperature.", ["have", "have got"], "I", "a temperature."),
        gr(hg, "She ______ tired today.", ["feels", "feel"], "She", "tired today."),
        gr(hg, "Does he ______ a sore throat?", ["have"], "Does he", "a sore throat?"),
        gr(hg, "They ______ sick after the meal.", ["felt", "feel"], "They", "sick after the meal."),
        gr(ht, "She usually ______ (get) up early.", ["gets"], "She usually", "up early."),
        gr(ht, "He ______ (not eat) junk food.", ["doesn't eat", "does not eat"], "He", "junk food."),
        gr(ht, "______ you ______ (wash) your hands before meals?", ["Do / wash", "Do you wash"], "", ""),
        gr(hw, "I have a toothache.", ["My tooth hurts.", "I have a pain in my tooth."]),
        gr(hw, "You should do more exercise.", ["You ought to do more exercise.", "You had better do more exercise."]),
        gr("U2 Writing — Reorder the words", "should/ You/ regularly/ exercise/.", ["You should exercise regularly.", "You should exercise regularly"]),
        gr("U2 Writing — Reorder the words", "junk/ eat/ shouldn't/ food/ You/.", ["You shouldn't eat junk food.", "You should not eat junk food."]),
        gr("U2 Writing — Reorder the words", "hands/ Wash/ before/ your/ meals/.", ["Wash your hands before meals.", "Wash your hands before meals"]),
    ]
    return {
        "unit": 2,
        "title": "Healthy Living",
        "source": "PDF/GRADE 7 HK1 (GS) FINAL.pdf (pages 16–27)",
        "skipped": [
            {"reason": "Thiếu ảnh", "item": "Look at pictures fill blanks"},
            {"reason": "S-V-O underline open", "item": "Underline Subject Verb Object"},
            {"reason": "Reading herbal medicine answer key chưa đủ", "item": "Reading exercises partial"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "scramble": [{"word": w, "hint": "U2 Health"} for w in ["healthy", "exercise", "vitamin", "temperature", "headache", "balanced", "hygiene", "protein", "calorie", "lifestyle"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U2"}
            for e, k, t in [
                ("Âm /f/", "F", "fit"),
                ("Âm /f/", "F", "coffee"),
                ("Âm /f/", "F", "leaf"),
                ("Âm /v/", "V", "very"),
                ("Âm /v/", "V", "vitamin"),
                ("Âm /v/", "V", "vegetable"),
                ("Âm /f/", "F", "enough"),
                ("Âm /v/", "V", "recover"),
            ]
        ],
        "speakingTopic": {"title": "Chat about healthy living", "durationSeconds": 300},
    }


def unit3():
    eo = "U3 Pronunciation — Past -ed"
    quiz = [
        odd(eo, ["arrived", "believed", "hoped", "opened"], "hoped"),
        odd(eo, ["stopped", "passed", "asked", "obeyed"], "obeyed"),
        odd(eo, ["cleaned", "watched", "laughed", "finished"], "cleaned"),
        odd(eo, ["wanted", "started", "ended", "walked"], "walked"),
        odd(eo, ["showed", "pushed", "rained", "followed"], "pushed"),
        fill("U3 Vocabulary — Community", "We ______ old people every weekend.", "help", ["help", "visit"]),
        fill("U3 Vocabulary — Community", "They ______ blood at the hospital.", "donate"),
        fill("U3 Vocabulary — Community", "Students ______ litter in the park.", "collect", ["collect", "pick up"]),
        fill("U3 Vocabulary — Community", "She ______ books to poor children.", "gives", ["gives", "donates"]),
        fill("U3 Vocabulary — Community", "Community service ______ other people.", "benefits", ["benefits", "helps"]),
        mc("U3 Reading — Community service", "What is community service?", "Work that benefits others", ["A paid job", "Work that benefits others", "A holiday", "A sport"]),
        mc("U3 Reading — Community service", "Is community service a paying job?", "No", ["Yes", "No", "Sometimes", "NOT GIVEN"]),
        mc("U3 Reading — Cloze", "Five years ago Will Slade ______ about an aid project.", "read", ["like", "same", "read", "sound like"]),
        mc("U3 Reading — Cloze", "He ______ working for the local community.", "started", ["was starting", "has started", "started", "starts"]),
        wf("U3 Word form", "She is a ______. (VOLUNTEER)", "volunteer"),
        wf("U3 Word form", "Their ______ helped many people. (DONATE)", "donation"),
        wf("U3 Word form", "It was a ______ experience. (MEAN)", "meaningful"),
        wf("U3 Word form", "We need more ______ in this project. (PARTICIPATE)", "participants", ["participants", "participation"]),
        wf("U3 Word form", "Helping others brings ______. (HAPPY)", "happiness"),
    ]
    hp = "U3 Grammar — Past simple"
    ha = "U3 Grammar — was/were/did"
    grammar = [
        gr(ha, "She ______ at home yesterday.", ["was"], "She", "at home yesterday."),
        gr(ha, "They ______ at the park last Sunday.", ["were"], "They", "at the park last Sunday."),
        gr(ha, "He ______ not at school yesterday.", ["was"], "He", "not at school yesterday."),
        gr(ha, "______ you go to the volunteer meeting?", ["Did"], "", "you go to the volunteer meeting?"),
        gr(ha, "We ______ not start the project in 2010.", ["did"], "We", "not start the project in 2010."),
        gr(hp, "They ______ (donate) blood last month.", ["donated"], "They", "blood last month."),
        gr(hp, "She ______ (help) old people yesterday.", ["helped"], "She", "old people yesterday."),
        gr(hp, "We ______ (not start) the community garden in 2010.", ["didn't start", "did not start"], "We", "the community garden in 2010."),
        gr(hp, "______ he ______ (join) the campaign?", ["Did / join", "Did he join"], "", ""),
        gr(hp, "I ______ (clean) the street with my classmates.", ["cleaned"], "I", "the street with my classmates."),
        gr("U3 Writing — Reorder the words", "donated/ They/ blood/ hospital/ the/ at/.", ["They donated blood at the hospital.", "They donated blood at the hospital"]),
        gr("U3 Writing — Reorder the words", "helped/ She/ people/ old/ weekend/ last/.", ["She helped old people last weekend.", "She helped old people last weekend"]),
        gr("U3 Writing — Rewrite", "They started the project in 2015.", ["Did they start the project in 2015?", "Did they start the project in 2015"]),
        gr("U3 Writing — Rewrite", "He was a volunteer last year.", ["He wasn't a volunteer last year.", "He was not a volunteer last year."]),
    ]
    return {
        "unit": 3,
        "title": "Community Service",
        "source": "PDF/GRADE 7 HK1 (GS) FINAL.pdf (pages 28–40)",
        "skipped": [
            {"reason": "Thiếu ảnh", "item": "Match pictures with volunteer activities"},
            {"reason": "Reading multi-section IELTS dense", "item": "Reading A–F matching full"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "scramble": [{"word": w, "hint": "U3 Community"} for w in ["volunteer", "donate", "litter", "benefit", "community", "campaign", "homeless", "elderly", "recycle", "charity"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U3"}
            for e, k, t in [
                ("Past -ed /t/", "EDT", "hoped"),
                ("Past -ed /t/", "EDT", "asked"),
                ("Past -ed /d/", "EDD", "arrived"),
                ("Past -ed /d/", "EDD", "opened"),
                ("Past -ed /ɪd/", "EDID", "wanted"),
                ("Past -ed /ɪd/", "EDID", "started"),
                ("Past -ed /t/", "EDT", "watched"),
                ("Past -ed /d/", "EDD", "cleaned"),
            ]
        ],
        "speakingTopic": {"title": "Chat about community service", "durationSeconds": 300},
    }


def unit4():
    eo = "U4 Pronunciation — Odd one out"
    quiz = [
        odd(eo, ["dish", "sugar", "shoes", "sing"], "sing"),
        odd(eo, ["vision", "pressure", "washer", "machine"], "vision"),
        odd(eo, ["division", "occasion", "leisure", "ensure"], "ensure"),
        odd(eo, ["chauffeur", "shampoo", "children", "cashier"], "children"),
        odd(eo, ["exhibition", "revision", "anxious", "social"], "anxious"),
        fill("U4 Vocabulary — Arts", "She can play the ______ very well.", "piano", ["piano", "guitar"]),
        fill("U4 Vocabulary — Arts", "This ______ was painted by a famous artist.", "picture", ["picture", "painting"]),
        fill("U4 Vocabulary — Arts", "We went to an art ______ last week.", "exhibition", ["exhibition", "gallery"]),
        fill("U4 Vocabulary — Arts", "Pop ______ is popular among teenagers.", "music"),
        fill("U4 Vocabulary — Arts", "He likes drawing ______.", "cartoons", ["comics", "cartoons"]),
        mc("U4 Speaking — Match", "What kind of music do you like?", "I like pop music.", ["I like pop music.", "In the cinema.", "Yes, I can.", "At 7 p.m."]),
        mc("U4 Speaking — Match", "Can you play any musical instruments?", "Yes, I can play the guitar.", ["Yes, I can play the guitar.", "I like painting.", "Twice a week.", "It's boring."]),
        wf("U4 Word form", "She is a famous ______. (ART)", "artist"),
        wf("U4 Word form", "The concert was ______. (WONDER)", "wonderful"),
        wf("U4 Word form", "He is a talented ______. (MUSIC)", "musician"),
        wf("U4 Word form", "This song is very ______. (ATTRACT)", "attractive"),
        wf("U4 Word form", "They had a great musical ______. (PERFORM)", "performance"),
    ]
    ha = "U4 Grammar — as ... as"
    hd = "U4 Grammar — different from / the same as"
    grammar = [
        gr(ha, "She sings ______ her sister. (well)", ["as well as"], "She sings", "her sister."),
        gr(ha, "This song is ______ that one. (popular)", ["as popular as"], "This song is", "that one."),
        gr(ha, "He doesn't paint ______ Picasso. (creatively)", ["as creatively as"], "He doesn't paint", "Picasso."),
        gr(ha, "My guitar is ______ yours. (good)", ["as good as"], "My guitar is", "yours."),
        gr(hd, "My taste in music is different from yours.", ["My taste in music is different from yours.", "My taste in music is different from yours"]),
        gr(hd, "This painting is the same as that one.", ["This painting is the same as that one.", "This painting is the same as that one"]),
        gr("U4 Writing — Rewrite", "This film is not as interesting as that film.", ["That film is more interesting than this film.", "That film is more interesting than this one."]),
        gr("U4 Writing — Rewrite", "My singing is the same as yours.", ["I sing as well as you.", "I sing as well as you do."]),
        gr("U4 Writing — Reorder the words", "plays/ She/ piano/ the/ beautifully/.", ["She plays the piano beautifully.", "She plays the piano beautifully"]),
        gr("U4 Writing — Reorder the words", "as/ not/ This/ song/ popular/ that/ as/ is/.", ["This song is not as popular as that.", "This song is not as popular as that one."]),
    ]
    return {
        "unit": 4,
        "title": "Music And Arts",
        "source": "PDF/GRADE 7 HK1 (GS) FINAL.pdf (pages 41–53)",
        "skipped": [
            {"reason": "Thiếu ảnh", "item": "Put words under pictures"},
            {"reason": "Reading dialogue dense", "item": "Reading exercises partial"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "scramble": [{"word": w, "hint": "U4 Arts"} for w in ["piano", "guitar", "artist", "melody", "concert", "painting", "gallery", "opera", "sculpture", "cinema"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U4"}
            for e, k, t in [
                ("Âm /ʃ/", "SH", "shoes"),
                ("Âm /ʃ/", "SH", "sugar"),
                ("Âm /ʒ/", "ZH", "vision"),
                ("Âm /ʒ/", "ZH", "leisure"),
                ("Âm /ʃ/", "SH", "machine"),
                ("Âm /ʃ/", "SH", "exhibition"),
                ("Âm /ʒ/", "ZH", "television"),
                ("Âm /ʃ/", "SH", "musician"),
            ]
        ],
        "speakingTopic": {"title": "Chat about music and arts", "durationSeconds": 300},
    }


def unit5():
    quiz = [
        fill("U5 Vocabulary — Food", "Phở is a traditional Vietnamese ______.", "dish", ["dish", "soup"]),
        fill("U5 Vocabulary — Food", "Add some ______ to the soup.", "salt", ["salt", "pepper"]),
        fill("U5 Vocabulary — Food", "I would like a ______ of tea.", "cup", ["cup", "glass"]),
        fill("U5 Vocabulary — Food", "Orange juice is my favourite ______.", "drink", ["drink", "beverage"]),
        fill("U5 Vocabulary — Food", "We need ______ rice for dinner.", "some", ["some", "any"]),
        mc("U5 Vocabulary — Countable", "Which noun is uncountable?", "rice", ["apple", "egg", "rice", "banana"]),
        mc("U5 Vocabulary — Countable", "Which noun is countable?", "sandwich", ["milk", "butter", "water", "sandwich"]),
        fill("U5 Grammar — Quantifiers", "There isn't ______ milk in the fridge.", "any"),
        fill("U5 Grammar — Quantifiers", "There are ______ apples on the table.", "some", ["some", "a lot of", "many"]),
        fill("U5 Grammar — Quantifiers", "How ______ sugar do you need?", "much"),
        fill("U5 Grammar — Quantifiers", "How ______ eggs are there?", "many"),
        fill("U5 Grammar — Quantifiers", "I'd like ______ orange, please.", "an"),
        fill("U5 Grammar — Quantifiers", "There is ______ lot of food at the party.", "a"),
        wf("U5 Word form", "This cake is ______. (TASTE)", "tasty", ["tasty", "tasteful"]),
        wf("U5 Word form", "She is a good ______. (COOK)", "cook", ["cook", "cooker"]),
        wf("U5 Word form", "The ______ of the dish is amazing. (FRESH)", "freshness"),
        wf("U5 Word form", "Eating junk food is ______. (HEALTH)", "unhealthy"),
        mc("U5 Speaking — Match", "Would you like some tea?", "Yes, please.", ["Yes, please.", "I play football.", "At school.", "Because I'm hungry."]),
        mc("U5 Speaking — Match", "How much milk do we need?", "Two litres.", ["Two litres.", "Yes, I do.", "In the kitchen.", "It's delicious."]),
    ]
    hq = "U5 Grammar — a/an/some/any/much/many"
    hh = "U5 Grammar — How much/How many"
    grammar = [
        gr(hq, "Have you got ______ potatoes?", ["any"], "Have you got", "potatoes?"),
        gr(hq, "I'd like ______ bread.", ["some"], "I'd like", "bread."),
        gr(hq, "There isn't ______ milk left.", ["any"], "There isn't", "milk left."),
        gr(hq, "There are ______ oranges in the basket.", ["some", "many", "a lot of"], "There are", "oranges in the basket."),
        gr(hq, "She bought ______ egg and ______ butter.", ["an / some", "an, some"], "She bought", "egg and butter."),
        gr(hh, "______ water do you drink a day?", ["How much"], "", "water do you drink a day?"),
        gr(hh, "______ apples are there?", ["How many"], "", "apples are there?"),
        gr(hh, "______ sugar do we need?", ["How much"], "", "sugar do we need?"),
        gr(hh, "______ bottles of juice have you had?", ["How many"], "", "bottles of juice have you had?"),
        gr("U5 Writing — Reorder the words", "like/ I'd/ some/ noodles/.", ["I'd like some noodles.", "I would like some noodles."]),
        gr("U5 Writing — Reorder the words", "much/ How/ milk/ there/ is/?", ["How much milk is there?", "How much milk is there"]),
        gr("U5 Writing — Rewrite", "There are a lot of bananas.", ["There are many bananas.", "There are lots of bananas."]),
        gr("U5 Writing — Rewrite", "I don't have any sugar.", ["I have no sugar.", "There isn't any sugar."]),
    ]
    return {
        "unit": 5,
        "title": "Food And Drink",
        "source": "PDF/GRADE 7 HK1 (GS) FINAL.pdf (pages 54–68)",
        "skipped": [
            {"reason": "Thiếu ảnh", "item": "Picture cues / complete words"},
            {"reason": "Cột countable grouping UI", "item": "Put words in columns"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "scramble": [{"word": w, "hint": "U5 Food"} for w in ["noodles", "pancake", "sandwich", "lemonade", "vinegar", "ingredient", "recipe", "dessert", "porridge", "omelette"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": "Food words", "exerciseKey": "FOOD", "targetText": t, "targetIpa": "", "hint": "U5"}
            for t in ["sugar", "salt", "sauce", "soup", "rice", "bread", "fruit", "juice"]
        ],
        "speakingTopic": {"title": "Chat about food and drink", "durationSeconds": 300},
    }


def unit6():
    eo = "U6 Pronunciation — Odd one out"
    quiz = [
        odd(eo, ["children", "chicken", "century", "child"], "century"),
        odd(eo, ["culture", "chapter", "feature", "literature"], "literature"),
        odd(eo, ["chair", "architect", "cheese", "child"], "architect"),
        odd(eo, ["message", "guarantee", "storage", "advantage"], "guarantee"),
        odd(eo, ["gradual", "soldier", "educate", "grade"], "soldier"),
        fill("U6 Vocabulary — School", "Students have ______ at 10 a.m.", "a break", ["a break", "break", "recess"]),
        fill("U6 Vocabulary — School", "The ______ teaches Mathematics.", "teacher"),
        fill("U6 Vocabulary — School", "We study in the ______.", "classroom", ["classroom", "class"]),
        fill("U6 Vocabulary — School", "The school ______ is big and green.", "yard", ["yard", "playground"]),
        fill("U6 Vocabulary — School", "She is in ______ 7A.", "class", ["class", "grade"]),
        fill("U6 Grammar — Prepositions", "The meeting is ______ Monday.", "on"),
        fill("U6 Grammar — Prepositions", "School starts ______ 7 a.m.", "at"),
        fill("U6 Grammar — Prepositions", "We have a test ______ the morning.", "in"),
        fill("U6 Grammar — Prepositions", "He goes ______ school by bus.", "to"),
        fill("U6 Grammar — Prepositions", "My birthday is ______ May.", "in"),
        fill("U6 Grammar — Prepositions", "See you ______ the weekend.", "at", ["at", "on"]),
        wf("U6 Word form", "She is a hard-working ______. (STUDY)", "student"),
        wf("U6 Word form", "This is an ______ school. (INTERNATION)", "international"),
        wf("U6 Word form", "Teachers need a lot of ______. (PATIENT)", "patience"),
        wf("U6 Word form", "His ______ results are excellent. (EDUCATE)", "education", ["education", "educational"]),
        mc("U6 Speaking — Match", "What subjects do you like?", "I like English and Maths.", ["I like English and Maths.", "At 7 o'clock.", "By bike.", "In grade 7."]),
        mc("U6 Speaking — Match", "How do you go to school?", "I go to school by bike.", ["I go to school by bike.", "Maths.", "Yes, I do.", "On Monday."]),
    ]
    hp = "U6 Grammar — Prepositions of time/place"
    grammar = [
        gr(hp, "We have English ______ Tuesday.", ["on"], "We have English", "Tuesday."),
        gr(hp, "The film starts ______ 8 p.m.", ["at"], "The film starts", "8 p.m."),
        gr(hp, "She was born ______ 2012.", ["in"], "She was born", "2012."),
        gr(hp, "They arrived ______ night.", ["at"], "They arrived", "night."),
        gr(hp, "I will see you ______ Christmas.", ["at"], "I will see you", "Christmas."),
        gr(hp, "The books are ______ the table.", ["on"], "The books are", "the table."),
        gr(hp, "He is sitting ______ the classroom.", ["in"], "He is sitting", "the classroom."),
        gr(hp, "Come ______ my office, please.", ["to"], "Come", "my office, please."),
        gr("U6 Writing — Reorder the words", "school/ to/ goes/ She/ bike/ by/.", ["She goes to school by bike.", "She goes to school by bike"]),
        gr("U6 Writing — Reorder the words", "have/ We/ English/ Mondays/ on/.", ["We have English on Mondays.", "We have English on Mondays"]),
        gr("U6 Writing — Rewrite", "School starts at seven o'clock.", ["What time does school start?", "What time does school start"]),
        gr("U6 Writing — Rewrite", "She goes to school by bus.", ["How does she go to school?", "How does she go to school"]),
    ]
    rac = [
        {
            "title": "U6 Reading — School visit summary",
            "instruction": "Complete the sentences with words from the box.",
            "word_bank": ["classroom", "library", "playground", "uniform", "break", "teachers"],
            "items": [
                {"order": 1, "sentence": "Students study in the ___.", "image": "", "answer": "classroom"},
                {"order": 2, "sentence": "You can borrow books from the ___.", "image": "", "answer": "library"},
                {"order": 3, "sentence": "Children play football in the ___.", "image": "", "answer": "playground"},
                {"order": 4, "sentence": "Students wear a school ___.", "image": "", "answer": "uniform"},
                {"order": 5, "sentence": "There is a short ___ between lessons.", "image": "", "answer": "break"},
                {"order": 6, "sentence": "___ help students learn new things.", "image": "", "answer": "teachers"},
            ],
        }
    ]
    return {
        "unit": 6,
        "title": "A Visit To A School",
        "source": "PDF/GRADE 7 HK1 (GS) FINAL.pdf (pages 69–82)",
        "skipped": [
            {"reason": "Thiếu ảnh", "item": "Put words under pictures"},
            {"reason": "Câu hỏi mở", "item": "Write questions for underlined words"},
            {"reason": "Reading flow-chart dense", "item": "Reading Exercise 2–3 partial"},
        ],
        "quiz": quiz,
        "grammar": grammar,
        "read_and_complete": rac,
        "scramble": [{"word": w, "hint": "U6 School"} for w in ["classroom", "library", "uniform", "playground", "teacher", "subject", "timetable", "break", "principal", "laboratory"]],
        "pronunciation": [
            {"mode": "word", "modeLabel": "Luyện từ", "exercise": e, "exerciseKey": k, "targetText": t, "targetIpa": "", "hint": "U6"}
            for e, k, t in [
                ("Âm /tʃ/", "CH", "children"),
                ("Âm /tʃ/", "CH", "teacher"),
                ("Âm /tʃ/", "CH", "chair"),
                ("Âm /dʒ/", "J", "job"),
                ("Âm /dʒ/", "J", "age"),
                ("Âm /dʒ/", "J", "subject"),
                ("Âm /tʃ/", "CH", "lunch"),
                ("Âm /dʒ/", "J", "graduation"),
            ]
        ],
        "speakingTopic": {"title": "Chat about a visit to a school", "durationSeconds": 300},
    }


if __name__ == "__main__":
    for builder in (unit1, unit2, unit3, unit4, unit5, unit6):
        dump(builder())
