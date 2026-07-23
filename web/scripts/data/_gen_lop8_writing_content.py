# -*- coding: utf-8 -*-
"""Generate curated Lớp 8 Writing → grammar/quiz import JSON."""
from __future__ import annotations

import json
from pathlib import Path


def mc(q, options, answer, exercise, accept=None):
    return {
        "game": "quiz",
        "type": "multiple_choice",
        "exercise": exercise,
        "question": q,
        "options": options,
        "answer": answer,
        "accept": accept or [answer],
        "fillMode": False,
        "typeLabel": "Trắc nghiệm",
        "skill": "writing",
    }


def circle(title, instruction, rows):
    """Circle-in-brackets / circle-the-option → choose_and_circle worksheet."""
    return {
        "game": "choose_and_circle",
        "title": title,
        "instruction": instruction,
        "items": [
            {
                "order": i + 1,
                "image": "",
                "prompt": q,
                "options": options,
                "answer": answer,
            }
            for i, (q, options, answer) in enumerate(rows)
        ],
    }


def fill(q, answer, exercise, accept=None):
    return {
        "game": "quiz",
        "type": "fill_blank",
        "exercise": exercise,
        "question": q,
        "answer": answer,
        "options": [],
        "accept": accept or [answer],
        "fillMode": True,
        "typeLabel": "Điền từ",
        "skill": "writing",
    }


def wf(q, answer, exercise, accept=None):
    return {
        "game": "quiz",
        "type": "word_form",
        "exercise": exercise,
        "question": q,
        "answer": answer,
        "options": [],
        "accept": accept or [answer],
        "fillMode": True,
        "typeLabel": "Từ loại",
        "skill": "writing",
    }


def gr(source, prefix, answers, suffix="", hint=""):
    return {
        "game": "grammar",
        "source": source,
        "prefix": prefix,
        "suffix": suffix,
        "hint": hint,
        "answers": answers if isinstance(answers, list) else [answers],
    }


def skip(skipped, unit, reason, item):
    skipped.append({"unit": unit, "reason": reason, "item": item})


def build():
    units: dict[int, list] = {}
    skipped: list[dict] = []

    # ---------- UNIT 1 Leisure ----------
    u1: list = []
    u1.append(
        circle(
            "G Exercise 5",
            "Circle the correct option in brackets.",
            [
                (
                    "Mary enjoys (to listen / listening) to classical music.",
                    ["to listen", "listening"],
                    "listening",
                ),
                (
                    "My sister adores (to make / making) paper flowers.",
                    ["to make", "making"],
                    "making",
                ),
                (
                    "Does she fancy (messaging / to message) her friends?",
                    ["messaging", "to message"],
                    "messaging",
                ),
                (
                    "My dad dislikes travelling. He always (stays / staying) at home on holidays.",
                    ["stays", "staying"],
                    "stays",
                ),
                (
                    "Mrs. Nhung hates (to train / trains) dogs.",
                    ["to train", "trains"],
                    "to train",
                ),
                (
                    "Most adults don't like (watch / to watch) cartoons.",
                    ["watch", "to watch"],
                    "to watch",
                ),
                (
                    "I'm into playing sport, especially table tennis. I (play / to play) table tennis almost every afternoon.",
                    ["play", "to play"],
                    "play",
                ),
                (
                    "My sister loves origami. She often (folds / folding) paper into attractive shapes.",
                    ["folds", "folding"],
                    "folds",
                ),
                (
                    "Linda prefers (visit / visiting) the beautiful beaches in Vietnam.",
                    ["visit", "visiting"],
                    "visiting",
                ),
                (
                    "Do your parents love (go / to go) to the theater in their free time?",
                    ["go", "to go"],
                    "to go",
                ),
            ],
        )
    )

    table0 = [
        ("Do you fancy _________________ football matches? (watch)", "watching"),
        ("My parents enjoy _________________ meals together on weekends. (prepare)", "preparing"),
        ("Lan and her sister love _________________ in their free time. (shop)", "shopping"),
        ("He prefers _________________ the Internet after school. (surf)", "surfing"),
        ("My mother detests _________________ out at that restaurant. (eat)", "eating"),
        (
            "I don't mind _________________ early every day, even on Sundays. (get up)",
            "getting up",
            ["getting up", "get up"],
        ),
        ("Do you prefer _________________ books in your free time? (read)", "reading"),
        ("My father loves _________________ golf with his friends. (play)", "playing"),
        (
            "I prefer _________________ up too late. (not stay)",
            "not staying",
            ["not staying", "not to stay"],
        ),
        (
            "I used to prefer _________________ with my friends at the weekend. (hang out)",
            "hanging out",
            ["hanging out", "hang out"],
        ),
        ("I think not many people like _________________ to her music. (listen)", "listening"),
        ("Teenagers love _________________ the web to while away their time. (surf)", "surfing"),
        (
            "Do you enjoy _________________ in your free time? (do DIY)",
            "doing DIY",
            ["doing DIY", "doing diy"],
        ),
        ("I detest _________________ a conversation with John. (have)", "having"),
        (
            "Do you think Jane prefers _________________ with other students? (not socialize)",
            "not socializing",
            ["not socializing", "not to socialize"],
        ),
        ("I don't mind _________________ the problem again. (explain)", "explaining"),
        ("Ann fancies _________________ to the songs of her favorite singer. (listen)", "listening"),
        ("My friend adores _________________ time with her cats. (spend)", "spending"),
        ("I always love _________________ new things when I go traveling. (try)", "trying"),
        ("Mr. Smith hates _________________ his old car. (drive)", "driving"),
        ("My boyfriend dislikes _________________. (wait)", "waiting"),
        ("My cat dislikes _________________ on the floor. (sleep)", "sleeping"),
        ("My cousin doesn't like _________________ Math and Chemistry. (study)", "studying"),
        ("She didn't want _________________ him about her plan. (tell)", "to tell"),
        ("I think your brother won't mind _________________ you a helping hand. (lend)", "lending"),
    ]
    for row in table0:
        q, ans = row[0], row[1]
        accept = row[2] if len(row) > 2 else [ans]
        u1.append(fill(q, ans, "G Exercise 6", accept))

    skip(skipped, 1, "sentence word-order / rearrange", "W Exercise 1 Put words in correct order")
    skip(
        skipped,
        1,
        "open-ended / weak fixed answer",
        "W Ex2 item: Lan likes using the computer → Lan's favorite …",
    )
    skip(
        skipped,
        1,
        "open-ended / weak fixed answer",
        "W Ex2 item: Making crafts… → It's very …",
    )

    rewrites_u1 = [
        (
            "I am interested in learning English.",
            "I like",
            ["learning English.", "learning English"],
        ),
        (
            "I am interested in going camping with my close friends.",
            "I fancy",
            ["going camping with my close friends.", "going camping with my close friends"],
        ),
        ("Mr. Pike is a big fan of water polo.", "Mr. Pike is fond", ["of water polo.", "of water polo"]),
        (
            "It is not a problem to me whether I have to pick her up to the cinema or not.",
            "I don't mind",
            [
                "picking her up to the cinema.",
                "picking her up to the cinema",
                "picking her up.",
            ],
        ),
        (
            "John cannot bear listening to such kind of noisy music.",
            "John dislikes",
            [
                "listening to such kind of noisy music.",
                "listening to such kind of noisy music",
            ],
        ),
        (
            "Watching historical films is very interesting to my younger brother.",
            "My younger brother enjoys",
            ["watching historical films.", "watching historical films"],
        ),
        (
            "She cannot bear talking with him about what he likes.",
            "She hates",
            ["talking with him about what he likes.", "talking with him about what he likes"],
        ),
        (
            "The thing that I hate most is motor racing, and I will never do it in my life.",
            "I detest",
            ["motor racing.", "motor racing"],
        ),
        (
            "It is really interesting for him to talk with his music teacher about jazz.",
            "He fancies",
            [
                "talking with his music teacher about jazz.",
                "talking with his music teacher about jazz",
            ],
        ),
        (
            "He uses all his free time to look after his garden.",
            "He spends",
            [
                "all his free time looking after his garden.",
                "all his free time looking after his garden",
            ],
        ),
        (
            "We usually visit museums when we have leisure time.",
            "We enjoy",
            [
                "visiting museums when we have leisure time.",
                "visiting museums in our leisure time.",
                "visiting museums.",
            ],
        ),
        (
            "I don't like to get up early and prepare breakfast in the cold winter days.",
            "I hate",
            [
                "getting up early and preparing breakfast in the cold winter days.",
                "to get up early and prepare breakfast in the cold winter days.",
            ],
        ),
        (
            "It took us 30 minutes to rehearse the song.",
            "We spent",
            ["30 minutes rehearsing the song.", "30 minutes rehearsing the song"],
        ),
        (
            "It took Tom one hour to travel to his hometown last week.",
            "Tom spent",
            [
                "one hour traveling to his hometown last week.",
                "one hour travelling to his hometown last week.",
                "an hour traveling to his hometown last week.",
                "an hour travelling to his hometown last week.",
            ],
        ),
        (
            "It took him 30 minutes to watch the play.",
            "He spent",
            ["30 minutes watching the play.", "30 minutes watching the play"],
        ),
        (
            "He likes swimming and sunbathing.",
            "He is interested",
            ["in swimming and sunbathing.", "in swimming and sunbathing"],
        ),
        (
            "It took her nearly an hour to do the crossword.",
            "She spent",
            ["nearly an hour doing the crossword.", "nearly an hour doing the crossword"],
        ),
        (
            "My teacher enjoys listening to folk songs in her free time as this helps her to reduce stress.",
            "My teacher likes",
            [
                "listening to folk songs in her free time as this helps her to reduce stress.",
                "listening to folk songs in her free time.",
            ],
        ),
    ]
    for src, pref, ans in rewrites_u1:
        u1.append(gr(src, pref, ans))

    skip(skipped, 1, "two blanks in one item", "Fill verb forms #42 Emily dislikes / enjoys")
    for num, q, ans in [
        (37, "I don't mind (stay) _____________ at home to look after the children.", "staying"),
        (38, "Riding a bike is Lan's pleasure, but she detests (walk) _____________ in the rain.", "walking"),
        (39, "As a child, he hated (read) _____________ books, but now he finds it enjoyable.", "reading"),
        (40, "Minh is in good shape. He enjoys (take) _____________ up sport and exercise.", "taking"),
        (
            41,
            "Mr Long doesn't like (get) _____________ up early in the morning, especially at the weekend.",
            "getting",
        ),
        (43, "I fancy (eat) _____________ out tonight because I'm too tired to cook.", "eating"),
        (44, "Nancy adores (hang) _____________ out with her best friend, Helen.", "hanging"),
        (45, "My brother loves (watch) _____________ live football on TV.", "watching"),
        (46, "Do people in your country like (visit) _____________ abroad on vacation?", "visiting"),
    ]:
        u1.append(fill(q, ans, "Fill verb forms 37-46"))

    for row in [
        ("Vietnamese people are very warm and ________________. (friend)", "friendly"),
        ("La Hill is a ______________ writer. (humor)", "humorous", ["humorous", "humourist", "humorist"]),
        ("I'm ______________ sorry for coming late. (extreme)", "extremely"),
        (
            "I love the ____________ of the atmosphere in the countryside. (peaceful)",
            "peacefulness",
            ["peacefulness", "peace"],
        ),
        ("Bao is very _____________, kind and generous. (social)", "sociable", ["sociable", "social"]),
        ("Each of my friend has a _________________ character. (difference)", "different"),
        (
            "We are good friends although each of us has a different ____________. (characteristic)",
            "character",
            ["character", "characteristic"],
        ),
        (
            "He spends most of his time doing charity work. He's a ______________ man. (social)",
            "sociable",
            ["sociable", "social"],
        ),
        (
            "He has a sense of _____________ because he often tells jokes. (humorous)",
            "humour",
            ["humour", "humor"],
        ),
        ("Nam makes friends very _____________ because he is very sociable. (ease)", "easily"),
        ("Hoa is very ____________. She doesn't talk to anybody in her class. (reservation)", "reserved"),
        ("A(n) ________ is a child who lost his parents. (orphanage)", "orphan"),
        ("They were very _________ to survive a fire. (luck)", "lucky"),
        ("Nga often helps poor and homeless people. She is ________. (generosity)", "generous"),
    ]:
        q, ans = row[0], row[1]
        accept = row[2] if len(row) > 2 else [ans]
        u1.append(wf(q, ans, "Word form", accept))

    u1 += [
        gr(
            "It takes Mr Long 30 minutes to drive to work everyday.",
            "Mr Long spends",
            [
                "30 minutes driving to work every day.",
                "30 minutes driving to work everyday.",
            ],
        ),
        gr(
            "He loves surfing the facebook in his leisure time.",
            "He is fond",
            [
                "of surfing the facebook in his leisure time.",
                "of surfing Facebook in his leisure time.",
                "of surfing Facebook.",
            ],
        ),
        gr(
            "Ms Lan hates going out at night.",
            "Ms Lan isn't keen",
            ["on going out at night.", "on going out at night"],
        ),
        gr(
            "Do you like making dollhouses in your leisure time?",
            "Are you interested",
            [
                "in making dollhouses in your leisure time?",
                "in making dollhouses in your leisure time",
            ],
        ),
    ]
    units[1] = u1

    # ---------- UNIT 2 Countryside ----------
    u2: list = []
    u2.append(
        circle(
            "G Exercise 5",
            "Circle the correct options to complete the sentences.",
            [
                (
                    "City people seem to react quicklier / more quickly to changes than countryside people.",
                    ["quicklier", "more quickly"],
                    "more quickly",
                ),
                (
                    "She came to the party later / more lately than her friends.",
                    ["later", "more lately"],
                    "later",
                ),
                (
                    "Does a computer work at calculus more fast / faster than a human being?",
                    ["more fast", "faster"],
                    "faster",
                ),
                (
                    "Nga writes English essays better / more well than Mai.",
                    ["better", "more well"],
                    "better",
                ),
                (
                    "Nick can jump higher / more high than Mike.",
                    ["higher", "more high"],
                    "higher",
                ),
                (
                    "Today it's raining more heavily / heavilier than it was yesterday.",
                    ["more heavily", "heavilier"],
                    "more heavily",
                ),
                (
                    "Juice contains more / many vitamins than coke.",
                    ["more", "many"],
                    "more",
                ),
                (
                    "The farmers in my village work hard / harder than the ones here.",
                    ["hard", "harder"],
                    "harder",
                ),
                (
                    "People in rural areas talk optimistically / more optimistically than city people.",
                    ["optimistically", "more optimistically"],
                    "more optimistically",
                ),
                (
                    "Ms. Sarah dances more beautifully / beautifully than Ms. Susan.",
                    ["more beautifully", "beautifully"],
                    "more beautifully",
                ),
            ],
        )
    )

    for q, ans, accept in [
        (
            "It usually rains ___________________ in Central Viet Nam than in other region. (heavy)",
            "more heavily",
            ["more heavily"],
        ),
        ("I will have to try a bit ___________________ than this. (hard)", "harder", ["harder"]),
        (
            "The hall was lighted ___________________ than the corridors. (bright)",
            "more brightly",
            ["more brightly"],
        ),
        (
            "Time goes by ___________________ when we are busy. (quick)",
            "more quickly",
            ["more quickly", "quicker"],
        ),
        (
            "Our family has lived ___________________ in the country than in the town since last year. (happy)",
            "more happily",
            ["more happily"],
        ),
        (
            "The boys were playing the game ___________________ than the girls. (noisy)",
            "more noisily",
            ["more noisily"],
        ),
        (
            "This task can be completed ___________________ than that one. (easy)",
            "more easily",
            ["more easily", "easier"],
        ),
        (
            "A tractor can plough ___________________ than a buffalo or a horse. (good)",
            "better",
            ["better"],
        ),
    ]:
        u2.append(fill(q, ans, "G Exercise 6", accept))

    for q, ans, accept in [
        ("My sister is ___________________ me. (tall)", "taller than", ["taller than"]),
        ("Blue whales are ___________________ elephants. (heavy)", "heavier than", ["heavier than"]),
        (
            "The Mekong River is ___________________ the Red River. (long)",
            "longer than",
            ["longer than"],
        ),
        (
            "Do you think English is ___________________ French in grammar? (easy)",
            "easier than",
            ["easier than"],
        ),
        (
            "My new bed is ___________________ my old bed. (comfortable)",
            "more comfortable than",
            ["more comfortable than"],
        ),
        (
            "The film about my village town is ___________________ the book. (interesting)",
            "more interesting than",
            ["more interesting than"],
        ),
        ("Tea is ___________________ coffee. (cheap)", "cheaper than", ["cheaper than"]),
        (
            "The new harvest machine is ___________________ than the old one. (effective)",
            "more effective",
            ["more effective"],
        ),
        (
            "The countryside is ___________________ the town. (beautiful)",
            "more beautiful than",
            ["more beautiful than"],
        ),
        (
            "A tractor is ___________________ a buffalo. (powerful)",
            "more powerful than",
            ["more powerful than"],
        ),
    ]:
        u2.append(fill(q, ans, "G Exercise 7", accept))

    skip(skipped, 2, "sentence word-order / rearrange", "W Exercise 1 Rearrange the words")

    # W Ex2 adj→adv rewrite (grammar)
    u2 += [
        gr(
            "Nick is a careful writer than Phuc. (carefully)",
            "Nick writes essays",
            ["more carefully than Phuc.", "more carefully than Phuc"],
        ),
        gr(
            "A snail is slower than a crab. (slowly)",
            "A snail moves",
            ["more slowly than a crab.", "more slowly than a crab", "slower than a crab."],
        ),
        gr(
            "My father's explanation about the subject was clearer than my brother's. (clearly)",
            "My father explained the subject",
            [
                "more clearly than my brother.",
                "more clearly than my brother",
                "more clearly than my brother's.",
            ],
        ),
        gr(
            "My cousin is a better singer than I am. (well)",
            "My cousin sings",
            ["better than I do.", "better than I do", "better than me.", "better than me"],
        ),
        gr(
            "Phong is a faster swimmer than Phuc. (fast)",
            "Phong swims",
            ["faster than Phuc.", "faster than Phuc"],
        ),
    ]

    # W Ex3 rewrite comparisons — keep clearest items
    u2_cmp = [
        ("Tim is older than Sarah.", "Sarah", ["is younger than Tim.", "is younger than Tim"]),
        (
            "Our house is larger than yours.",
            "Your house",
            ["is smaller than ours.", "is smaller than ours", "is not as large as ours."],
        ),
        (
            "Bill is not as tall as David.",
            "Bill",
            ["is shorter than David.", "is shorter than David", "is less tall than David."],
        ),
        (
            "Jack's marks are worse than mine.",
            "My marks",
            ["are better than Jack's.", "are better than Jack's", "are better than Jack's marks."],
        ),
        (
            "This book is the same price as that one.",
            "That book is",
            [
                "the same price as this one.",
                "the same price as this one",
                "as expensive as this one.",
            ],
        ),
        (
            "Your bike is slower than mine.",
            "My bike is",
            ["faster than yours.", "faster than yours"],
        ),
        (
            "My house is bigger than your house.",
            "Your house",
            ["is smaller than mine.", "is smaller than mine", "is not as big as mine."],
        ),
        (
            "The black car is cheaper than the red car.",
            "The red car",
            ["is more expensive than the black car.", "is more expensive than the black one."],
        ),
        (
            "This film is more interesting than that one.",
            "That film",
            [
                "is less interesting than this one.",
                "is not as interesting as this one.",
                "is less interesting than this film.",
            ],
        ),
        (
            "My kitchen is smaller than yours.",
            "Your kitchen",
            ["is bigger than mine.", "is larger than mine.", "is bigger than mine"],
        ),
        (
            "My mother cannot cook as well as me.",
            "I can",
            ["cook better than my mother.", "cook better than my mother"],
        ),
        (
            "She has a house which is not as modern as my house.",
            "My house",
            ["is more modern than hers.", "is more modern than her house."],
        ),
        (
            "He cannot play tennis as well as Jack.",
            "Jack can",
            ["play tennis better than him.", "play tennis better than he can."],
        ),
        (
            "I did not spend as much money as you.",
            "You spent",
            ["more money than me.", "more money than I did.", "more money than I."],
        ),
        (
            "A city has more interesting activities than the countryside.",
            "The countryside",
            [
                "has fewer interesting activities than a city.",
                "has less interesting activities than a city.",
            ],
        ),
        (
            "A motorbike goes faster than a bike.",
            "A bike",
            ["goes more slowly than a motorbike.", "goes slower than a motorbike."],
        ),
        (
            "Life in the city is busier than life in the countryside.",
            "Life in the countryside is",
            ["less busy than life in the city.", "quieter than life in the city."],
        ),
        (
            "His uncle works less responsibly than Mr. Nam.",
            "Mr. Nam",
            ["works more responsibly than his uncle.", "works more responsibly than his uncle"],
        ),
        (
            "Jane makes crafts better than her sister.",
            "Jane's sister",
            [
                "makes crafts worse than Jane.",
                "doesn't make crafts as well as Jane.",
                "makes crafts less well than Jane.",
            ],
        ),
    ]
    skip(skipped, 2, "low confidence / awkward stem", "W Ex3 #13 The movie was boring…")
    skip(skipped, 2, "low confidence / awkward stem", "W Ex3 #16 I didn't think this book…")
    skip(skipped, 2, "weak / incomplete stem", "W Ex3 #21 We fancy doing the housework.")
    for src, pref, ans in u2_cmp:
        u2.append(gr(src, pref, ans))

    # comparative word form 40-43
    for q, ans in [
        ("Nam drives carefully, but his sister drives much ______________. (carefully)", "more carefully"),
        ("I work hard, but my father works much ______________. (hard)", "harder"),
        ("She writes English words more ______________ than her brother. (quickly)", "quickly"),
        ("I often get up ______________ than my sister. (early)", "earlier"),
    ]:
        u2.append(fill(q, ans, "Comparative forms 40-43"))

    for row in [
        ("I'll make ________________ for the meeting tomorrow. (arrange)", "arrangements", ["arrangements", "arrangement"]),
        ("There was still no _______________ on what to do next. (agree)", "agreement"),
        ("HCM City is an important _________________ center. (commerce)", "commercial"),
        ("Michael Faraday made a lot of ________________ in the field of electronic. (invent)", "inventions", ["inventions", "invention"]),
        ("There was an _________________ of painting at the Art gallery. (exhibit)", "exhibition"),
        ("Your order is ready for ________________. (deliver)", "delivery"),
        ("Thomas Watson was Bell's ________________, wasn't he? (assist)", "assistant"),
        ("He was _______________ in demonstrating his inventions. (success)", "successful"),
        ("Bell demonstrated his ________________ at a lot of exhibitions. (invent)", "invention", ["invention", "inventions"]),
        ("He was asked to _______________ how to connect with the Internet. (demonstration)", "demonstrate"),
        ("We have to make careful ________________ for our trip to Malaysia. (arrange)", "arrangements", ["arrangements", "arrangement"]),
        ("What led to the _________________ of the telephone? (invent)", "invention"),
        ("Lan felt sad because she was _______________ in her job. (success)", "unsuccessful"),
        ("He likes ________________ movies very much. (act)", "action", ["action", "acting"]),
        ("Marconi was the ________________ of radio. (invent)", "inventor"),
    ]:
        q, ans = row[0], row[1]
        accept = row[2] if len(row) > 2 else [ans]
        u2.append(wf(q, ans, "Word form", accept))

    u2 += [
        gr(
            "Why don't we close all the windows?",
            "How about",
            ["closing all the windows?", "closing all the windows"],
        ),
        gr(
            "Minh is a better typist than Hieu.",
            "Minh types",
            ["better than Hieu.", "better than Hieu", "faster than Hieu."],
        ),
        gr(
            "It takes us an hour to run in the morning.",
            "We spend",
            ["an hour running in the morning.", "an hour running in the morning"],
        ),
        gr(
            "Nam is a more wonderful tennis player than Mr Long.",
            "Nam plays",
            [
                "tennis more wonderfully than Mr Long.",
                "tennis better than Mr Long.",
            ],
        ),
        gr(
            "Mono dances more beautifully than Son Tung.",
            "Mono is a",
            [
                "more beautiful dancer than Son Tung.",
                "better dancer than Son Tung.",
            ],
        ),
    ]
    units[2] = u2

    # ---------- UNIT 3 Teenagers ----------
    u3: list = []
    skip(skipped, 3, "sentence word-order / rearrange", "W Exercise 1 Rearrange the words")
    skip(
        skipped,
        3,
        "compound free production / many valid answers",
        "W Exercise 2 Combine into compound sentence",
    )
    skip(
        skipped,
        3,
        "compound free production / many valid answers",
        "W Exercise 3 Write compound with conjunctive adverb",
    )

    # Table2 conjunctions
    conj = [
        ("The police have sold the car in auction, ____ no one came to take it.", ["but", "so", "for"], "for"),
        ("Whale Festival is the biggest festival of the fishermen, ____ it is common.", ["and", "but", "or"], "and"),
        ("The discussion was not exciting, ____ was it informative.", ["or", "so", "nor"], "nor"),
        ("It may rain tomorrow, ____ we are going home in any case.", ["but", "nor", "and"], "but"),
        ("The staff in our company can dine out, ____ they can order in.", ["so", "or", "for"], "or"),
        ("Dorothy works ten hours a day, ____ he has time to volunteer at a charity.", ["yet", "and", "nor"], "yet"),
        ("The injured man was incapable of walking, ____ he had to be carried.", ["but", "and", "so"], "so"),
        ("She looks shy and skinny, ____ she is a karate athlete.", ["or", "yet", "and"], "yet"),
        ("I made a suggestion, ____ they chose to ignore it.", ["so", "but", "nor"], "but"),
        ("I bought these three shirts, ____ they gave me the another one for free.", ["for", "and", "or"], "and"),
    ]
    for q, opts, ans in conj:
        u3.append(mc(q, opts, ans, "G Exercise 3 Conjunctions"))

    for row in [
        ("Be careful to cover the ___________ sockets for the safety of the children. (electric)", "electrical", ["electrical", "electric"]),
        ("Every _________________ in my neighborhood has at least a TV set. (house)", "household"),
        ("Hard work always brings _______________. (succeed)", "success"),
        ("She is often worried about the _____________ of all electric appliances in her house. (safe)", "safety"),
        ("In order to save ________, remember to turn off all the lights in the room before you leave. (electric)", "electricity"),
        ("You should obey the _________ regulations at the hospital. (safe)", "safety"),
        ("The __________ victims were sent to the hospital yesterday. (injure)", "injured"),
        ("You have to keep all __________ objects out of the children's reach. (danger)", "dangerous"),
        ("A kitchen is not a ______________ place to play. (suitability)", "suitable"),
        ("Heat gradually ______________ vitamin C. (destruction)", "destroys", ["destroys", "destroy"]),
        ("It's a ____________ idea for children to do some working at early age. (marvel)", "marvelous", ["marvelous", "marvellous"]),
        ("Most teenagers like taking part in _____________ service. (communal)", "community", ["community", "communal"]),
        ("Warm clothes are ______________ for hot weather. (suit)", "unsuitable"),
        ("The _______________ of atom bomb is very terrible. (destroy)", "destruction"),
    ]:
        q, ans = row[0], row[1]
        accept = row[2] if len(row) > 2 else [ans]
        u3.append(wf(q, ans, "Word form", accept))

    u3 += [
        gr(
            "Jack has a new laptop; however, he never logs on his account on the Facebook.",
            "Although",
            [
                "Jack has a new laptop, he never logs on his account on the Facebook.",
                "Jack has a new laptop, he never logs on his Facebook account.",
            ],
        ),
        gr(
            "Lan wants to study better, so she turns off her mobile phone.",
            "Because",
            [
                "Lan wants to study better, she turns off her mobile phone.",
                "she wants to study better, Lan turns off her mobile phone.",
            ],
        ),
        gr(
            "Tuan is hard-working, so he often gets good marks on exams.",
            "Because",
            [
                "Tuan is hard-working, he often gets good marks on exams.",
                "he is hard-working, Tuan often gets good marks on exams.",
            ],
        ),
        gr(
            "Mono bought a lot of books, for he likes reading.",
            "Mono",
            [
                "bought a lot of books because he likes reading.",
                "likes reading, so he bought a lot of books.",
            ],
        ),
        gr(
            "Quan is a club member; however, he never participates in any activities.",
            "Although",
            [
                "Quan is a club member, he never participates in any activities.",
                "he is a club member, Quan never participates in any activities.",
            ],
        ),
    ]
    units[3] = u3

    # ---------- UNIT 4 Ethnic groups ----------
    u4: list = []
    u4.append(
        circle(
            "G Exercise 3",
            "Circle the correct words in brackets.",
            [
                (
                    "There are lots of (school/ schools) for minority children nowadays.",
                    ["school", "schools"],
                    "schools",
                ),
                ("She doesn't have any (money/moneys).", ["money", "moneys"], "money"),
                (
                    "We will build a (boarding school/ boarding schools) next year.",
                    ["boarding school", "boarding schools"],
                    "boarding school",
                ),
                (
                    "(Person/ People) in the mountains live close to nature.",
                    ["Person", "People"],
                    "People",
                ),
                (
                    "There are many (service/ services) in the city.",
                    ["service", "services"],
                    "services",
                ),
                (
                    "The Kinh is the largest ethnic (group/ groups) in Viet Nam.",
                    ["group", "groups"],
                    "group",
                ),
                ("What is (life/ lives) in your village like?", ["life", "lives"], "life"),
                (
                    "Banh Chung is made from (sticky rice/ sticky rices)",
                    ["sticky rice", "sticky rices"],
                    "sticky rice",
                ),
                (
                    "He thinks doing puzzles takes much (time/ times).",
                    ["time", "times"],
                    "time",
                ),
                (
                    "Teens need eight to ten (hour/ hours) of sleep a day.",
                    ["hour", "hours"],
                    "hours",
                ),
            ],
        )
    )

    for q, ans, accept in [
        ("Are they minority people? – Yes, they __________________.", "are", ["are"]),
        ("Can you go with us this afternoon? – Yes, I __________________.", "can", ["can"]),
        ("Was Mai at home alone yesterday? – No, she __________________.", "wasn't", ["wasn't", "was not"]),
        ("Did they catch fish in the river? – No, they __________________.", "didn't", ["didn't", "did not"]),
        ("Does it have an open fire in the middle of the house? – Yes, it __________________.", "does", ["does"]),
        ("Will you visit the village of the Ede? – No, we __________________.", "won't", ["won't", "will not"]),
        ("Were they weaving clothing at that time? – Yes, they __________________.", "were", ["were"]),
        ("May I open the book? – No, you __________________.", "may not", ["may not", "mustn't", "must not"]),
        ("Should I stay up too late? – No, you __________________.", "shouldn't", ["shouldn't", "should not"]),
        ("Do the farmers move to a new place when the soil become poor? – Yes, they __________________.", "do", ["do"]),
    ]:
        u4.append(fill(q, ans, "G Exercise 4", accept))

    # Ex5 plural — single-blank only; skip multi-blank rows
    plural_ok = [
        ("Minority groups have their own musical __________________. (instrument)", "instruments"),
        ("The King use sticky __________________. (rice)", "rice"),
        ("My grandmother used to teach me many folk __________________. (song)", "songs"),
        ("The staircase of a Muong's stilt house has an odd number of __________________. (step)", "steps"),
        ("A big stilt house stands on high __________________. (post)", "posts"),
        ("The number of minority __________________ going to school is going up. (child)", "children"),
        ("People in the mountains live close to __________________. (nature)", "nature"),
    ]
    skip(skipped, 4, "two blanks in one item", "G Ex5 wood/leaf, woman/housework, land/crop")
    for q, ans in plural_ok:
        u4.append(fill(q, ans, "G Exercise 5"))

    # Yes/No questions → grammar
    yn = [
        ("He is a farmer.", "Is he", ["a farmer?", "a farmer"]),
        ("They use simple farming techniques.", "Do they", ["use simple farming techniques?", "use simple farming techniques"]),
        ("I will read a documentary about ethnic groups of Viet Nam.", "Will I", ["read a documentary about ethnic groups of Viet Nam?", "read a documentary about ethnic groups of Viet Nam"]),
        ("Nga plays the piano very well.", "Does Nga", ["play the piano very well?", "play the piano very well"]),
        ("Women play an important role in a Jarai family.", "Do women", ["play an important role in a Jarai family?", "play an important role in a Jarai family"]),
        ("She should do exercises regularly.", "Should she", ["do exercises regularly?", "do exercises regularly"]),
        ("My father cooked noodles for me last night.", "Did my father", ["cook noodles for me last night?", "cook noodles for me last night"]),
        ("You may go out with your friends tonight.", "May you", ["go out with your friends tonight?", "go out with your friends tonight"]),
        ("We grow vegetables and raise livestocks.", "Do we", ["grow vegetables and raise livestocks?", "grow vegetables and raise livestock?"]),
        ("Nam and his friends were in a stilt house last week.", "Were Nam and his friends", ["in a stilt house last week?", "in a stilt house last week"]),
        ("The local people walk to the market every day.", "Do the local people", ["walk to the market every day?", "walk to the market every day"]),
        ("Artists from the Central Highlands will give Cong performances in the festival.", "Will artists from the Central Highlands", ["give Cong performances in the festival?", "give Cong performances in the festival"]),
        ("The Hoa Ban Festival takes place in Lai Chau.", "Does the Hoa Ban Festival", ["take place in Lai Chau?", "take place in Lai Chau"]),
        ("It is three kilometres from the village to the nearest river.", "Is it", ["three kilometres from the village to the nearest river?", "three kilometres from the village to the nearest river"]),
        ("I have been to Sapa several times.", "Have I", ["been to Sapa several times?", "been to Sapa several times"]),
        ("The girls with a shawl on their heads are members of the Thai.", "Are the girls with a shawl on their heads", ["members of the Thai?", "members of the Thai"]),
        ("We can find terraced fields in the northern mountainous regions.", "Can we", ["find terraced fields in the northern mountainous regions?", "find terraced fields in the northern mountainous regions"]),
        ("They built their houses on stilts to prevent flooding from tides or storms.", "Did they", ["build their houses on stilts to prevent flooding from tides or storms?", "build their houses on stilts to prevent flooding from tides or storms"]),
        ("The Tay are the earliest known minority in Viet Nam.", "Are the Tay", ["the earliest known minority in Viet Nam?", "the earliest known minority in Viet Nam"]),
        ("The population of the Tay ethnic group is about 1.7 million.", "Is the population of the Tay ethnic group", ["about 1.7 million?", "about 1.7 million"]),
    ]
    for src, pref, ans in yn:
        u4.append(gr(src, pref, ans))

    skip(skipped, 4, "make sentences from prompts / med confidence", "W Exercise 2")
    skip(skipped, 4, "Q&A pair items", "W Exercise 3 Write questions and answers")
    skip(skipped, 4, "Wh-question from underlined words (underline not encoded)", "W Exercise 4 + 37-40")
    skip(skipped, 4, "compound-ish free production", "Using words given to write meaningful sentences 55-58")

    for row in [
        ("All the singers wore _______________ costumes. (tradition)", "traditional"),
        ("______________, I lost my keys on the way home. (fortunate)", "Unfortunately", ["Unfortunately", "unfortunately"]),
        ("A fairy ______________ changed Little Pea's rags into beautiful clothes. (magic)", "magically"),
        ("Everyone was very ___________ after hearing that news. (excite)", "excited"),
        ("You made a wise _____________ when you chose to study Spanish. (decide)", "decision"),
        ("The boy fell off his bicycle and _______________ broke his arm. (fortunate)", "unfortunately"),
        ("The \"Lost Shoe\" is one of the _____________ stories I like best. (tradition)", "traditional"),
        ("His sudden _____________ surprised all of us. (appear)", "appearance"),
        ("The tiger wanted to see the farmer's _____________. (wise)", "wisdom"),
        ("He is so proud of his _______________. (wise)", "wisdom"),
        ("I can't stand people who are ____________ to animals. (cruelty)", "cruel"),
        ("The children were very _____________ to hear the fairy tale. (excite)", "excited"),
        ("My grandfather often wears _____________ clothes on the Tet holiday. (tradition)", "traditional"),
        ("Children were very happy with the _____________ of the fairy. (appear)", "appearance"),
    ]:
        q, ans = row[0], row[1]
        accept = row[2] if len(row) > 2 else [ans]
        u4.append(wf(q, ans, "Word form", accept))
    units[4] = u4

    # ---------- UNIT 5 Customs ----------
    u5: list = [
        circle(
            "G Exercise 3",
            "Circle the correct option in brackets.",
            [
                ("Nobody lives on (a / the) Moon.", ["a", "the"], "the"),
                (
                    "We went to Tien Giang by (a / no article) coach.",
                    ["a", "no article"],
                    "no article",
                ),
                ("It is (a / an) exciting trip.", ["a", "an"], "an"),
                (
                    "He sometimes comes (the / no article) home late.",
                    ["the", "no article"],
                    "no article",
                ),
                (
                    "I will bring some food to (no article / the) party on Sunday.",
                    ["no article", "the"],
                    "the",
                ),
                (
                    "There is (an / a) ornamental tree in my living room.",
                    ["an", "a"],
                    "an",
                ),
                (
                    "The Ban Flower Festival takes place in (the / no article) March.",
                    ["the", "no article"],
                    "no article",
                ),
                (
                    "They have never been to (no article / the) U.K.",
                    ["no article", "the"],
                    "the",
                ),
                (
                    "Fansipan is (no article / the) highest mountain in Viet Nam.",
                    ["no article", "the"],
                    "the",
                ),
                (
                    "She gave me (no article / a) big birthday cake.",
                    ["no article", "a"],
                    "a",
                ),
            ],
        )
    ]

    for q, ans in [
        ("My daughter is ________________ architect.", "an"),
        ("She has ________________ interesting comic book.", "an"),
        ("I think he will be ________________ good student.", "a"),
        ("They have left for ________________ hour.", "an"),
        ("She wore ________________ pink dress at the party last night.", "a"),
        ("We will have ________________ party to wish our grandparents longevity.", "a"),
        ("You should take ________________ umbrella in case it rains.", "an"),
        ("My uncle has ________________ coffee plantation in Kon Tum.", "a"),
        ("Women also play ________________ important role in our society.", "an"),
        ("Dragon-snake is ________________ folk game in Viet Nam.", "a"),
    ]:
        u5.append(fill(q, ans, "G Exercise 4"))

    skip(skipped, 5, "sentence word-order / rearrange", "W Exercise 1 Reorder the words")
    skip(skipped, 5, "labeled Rewrite but actually jumbled phrases", "W Exercise 2")
    skip(skipped, 5, "write full sentences from prompts / med confidence", "W Exercise 3")

    # W Ex4 rewrite based on keywords
    u5 += [
        gr(
            "There's a tradition that English people drink a lot of tea. (follow)",
            "English people",
            [
                "follow the tradition of drinking a lot of tea.",
                "follow a tradition of drinking a lot of tea.",
            ],
        ),
        gr(
            "Last year we went to Thailand on Tet holiday. (broke)",
            "Last year we",
            [
                "broke with tradition by going to Thailand on Tet holiday.",
                "broke tradition by going to Thailand on Tet.",
            ],
        ),
        gr(
            "The Vietnamese have the custom of worshipping ancestors. (there)",
            "There",
            [
                "is a custom of worshipping ancestors in Viet Nam.",
                "is a Vietnamese custom of worshipping ancestors.",
            ],
        ),
        gr(
            "It's the custom for Vietnamese parents to celebrate their baby's first month. (have)",
            "Vietnamese parents",
            [
                "have the custom of celebrating their baby's first month.",
                "have a custom of celebrating their baby's first month.",
            ],
        ),
        gr(
            "According to tradition, Vietnamese people celebrate the Mid-Autumn Festival every year. (There)",
            "There",
            [
                "is a tradition that Vietnamese people celebrate the Mid-Autumn Festival every year.",
                "is a tradition of celebrating the Mid-Autumn Festival every year in Viet Nam.",
            ],
        ),
        gr(
            "The Ok Om Bok Festival takes place in October. (organize)",
            "The Ok Om Bok Festival",
            [
                "is organized in October.",
                "is organised in October.",
            ],
        ),
        gr(
            "It's a good idea to hand bowls with both hands. (should)",
            "You should",
            ["hand bowls with both hands.", "hand bowls with both hands"],
        ),
        gr(
            "We should wait for the host to start eating. (better)",
            "We had better",
            [
                "wait for the host to start eating.",
                "wait for the host to start eating",
            ],
        ),
        gr(
            "Don't sweep the floor on the first three days of Tet. (shouldn't)",
            "You shouldn't",
            [
                "sweep the floor on the first three days of Tet.",
                "sweep the floor on the first three days of Tet",
            ],
        ),
        gr(
            "Never use bad words in conversations with others, especially with older people. (had)",
            "You had better",
            [
                "not use bad words in conversations with others, especially with older people.",
                "never use bad words in conversations with others, especially with older people.",
            ],
        ),
    ]

    for row in [
        ("Her disappearance has never been _______________ explained. (satisfy)", "satisfactorily"),
        ("Do you know the _______________ of that word? (pronounce)", "pronunciation"),
        ("I'm pleased to hear you had an _____________ summer vacation. (enjoy)", "enjoyable"),
        ("Don't you know the ______________ of self-study? (important)", "importance"),
        ("Her parents are ________ with her good behavior. (please)", "pleased"),
        ("Our project wouldn't be ______________ without your kind cooperation. (success)", "successful"),
        ("You don't have to ______ the grammar rules to be able to do these exercises. (memory)", "memorise", ["memorise", "memorize"]),
        ("You have to _____________ those English vocabularies every day. (revision)", "revise"),
        ("She actively ______________ in social work. (participation)", "participates"),
        ("His ______________ towards her is becoming more and more aggressive. (behave)", "behaviour", ["behaviour", "behavior"]),
        ("We used to ______________ in many activities of communal center. (participation)", "participate"),
        ("I can do all of these exercises ______________. (easy)", "easily"),
        ("He was ___________ of his achievements in the field of politics. (pride)", "proud"),
        ("His _________________ of some words is not correct. (pronounce)", "pronunciation"),
        ("Her ________ prevented her from success. (nervous)", "nervousness"),
    ]:
        q, ans = row[0], row[1]
        accept = row[2] if len(row) > 2 else [ans]
        u5.append(wf(q, ans, "Word form", accept))

    # Combine pairs — high enough confidence
    u5 += [
        gr(
            "Chu Dong Chu couldn't buy any special food. He was very poor. (because)",
            "Chu Dong Chu couldn't buy any special food",
            [
                "because he was very poor.",
                "because he was very poor",
            ],
        ),
        gr(
            "During Tet, Vietnamese people buy all kinds of sweets. They make Chung cakes as well. (And)",
            "During Tet, Vietnamese people buy all kinds of sweets",
            [
                "and they make Chung cakes as well.",
                "and make Chung cakes as well.",
            ],
        ),
        gr(
            "No one in my class is as tall as Mono. (the)",
            "Mono is",
            ["the tallest in my class.", "the tallest student in my class."],
        ),
        gr(
            "Nam didn't speak English as well as Huy. (than)",
            "Huy spoke English",
            ["better than Nam.", "better than Nam"],
        ),
        gr(
            "No one in my group is as beautiful as Jane. (the)",
            "Jane is",
            ["the most beautiful in my group.", "the most beautiful girl in my group."],
        ),
        gr(
            "It's good for us to keep our traditional customs. (should)",
            "We should",
            ["keep our traditional customs.", "keep our traditional customs"],
        ),
        gr(
            "He spent an hour walking to school last night. (took)",
            "It took",
            [
                "him an hour to walk to school last night.",
                "him an hour to walk to school last night",
            ],
        ),
    ]
    units[5] = u5

    # ---------- UNIT 6 Lifestyles ----------
    u6: list = []
    for q, ans, accept in [
        ("We ______________________ an online talk tomorrow. (have)", "will have", ["will have", "'ll have"]),
        ("They ______________________ their first-term exams soon. (take)", "will take", ["will take", "'ll take"]),
        ("Her daughter ______________________ from the University of Architecture in 2024. (graduate)", "will graduate", ["will graduate", "'ll graduate"]),
        ("I think people ______________________ on the Moon in five years. (not, live)", "won't live", ["won't live", "will not live"]),
        ("My brother ______________________ me his old electric bike. (give)", "will give", ["will give", "'ll give"]),
        ("Mai ______________________ a doctor in the future. (be)", "will be", ["will be", "'ll be"]),
        ("My family ______________________ to Phu Quoc Island next week. (not, go)", "won't go", ["won't go", "will not go"]),
        ("This machine ______________________ on solar energy. (run)", "will run", ["will run", "'ll run"]),
        ("______________________ the piano at their wedding party? (Nga, play)", "Will Nga play", ["Will Nga play", "Will Nga play?"]),
        ("______________________ his car to work? (he, drive)", "Will he drive", ["Will he drive", "Will he drive?"]),
    ]:
        u6.append(fill(q, ans, "G Exercise 6", accept))

    # First conditional two blanks — encode as "A / B"
    cond = [
        ("If we ______________________ more, we ______________________ the Earth. (recycle)/(help)", "recycle / will help", ["recycle / will help", "recycle/will help", "recycle, will help"]),
        ("If you ______________________ exercise regularly, you ______________________ healthy. (do)/(stay)", "do / will stay", ["do / will stay", "do/will stay", "do, will stay"]),
        ("If he ______________________ iced water, he ______________________ a cough. (drink)/(have)", "drinks / will have", ["drinks / will have", "drinks/will have", "drinks, will have"]),
        ("If I ______________________ money, I ______________________ a laptop. (have)/(buy)", "have / will buy", ["have / will buy", "have/will buy", "have, will buy"]),
        ("If people ______________________ by bicycle, there ______________________ less air pollution. (travel)/(be)", "travel / will be", ["travel / will be", "travel/will be", "travel, will be"]),
        ("If she ______________________ at this time, she ______________________ a loser. (stop)/(be)", "stops / will be", ["stops / will be", "stops/will be", "stops, will be"]),
        ("If he ______________________ harder, I ______________________ him more. (work)/(pay)", "works / will pay", ["works / will pay", "works/will pay", "works, will pay"]),
        ("If Tom ______________________ time, he ______________________ his aunt in District 9. (have)/(visit)", "has / will visit", ["has / will visit", "has/will visit", "has, will visit"]),
        ("If I ______________________ the poem by heart, my teacher ______________________ me. (not, learn)/(punish)", "don't learn / will punish", ["don't learn / will punish", "do not learn / will punish", "don't learn/will punish"]),
        ("If Nam ______________________ to Thailand, he ______________________ their traditional dances. (go)/(watch)", "goes / will watch", ["goes / will watch", "goes/will watch", "goes, will watch"]),
    ]
    for q, ans, accept in cond:
        u6.append(fill(q + " (write: verb1 / verb2)", ans, "G Exercise 7", accept))

    u6.append(
        circle(
            "G Exercise 8",
            "Circle the correct options in brackets.",
            [
                (
                    "We will stay at home if it (will rain / rains) heavily.",
                    ["will rain", "rains"],
                    "rains",
                ),
                (
                    "You can (see / will see) more clearly if you use a flashlight.",
                    ["see", "will see"],
                    "see",
                ),
                (
                    "The game will start if you (put / will put) a coin in the slot.",
                    ["put", "will put"],
                    "put",
                ),
                (
                    "If he eats too much fried chicken, he (gains / will gain) weight.",
                    ["gains", "will gain"],
                    "will gain",
                ),
                (
                    "The sea level (rises / will rise) if the planet gets hotter.",
                    ["rises", "will rise"],
                    "will rise",
                ),
                (
                    "What (happens / will happen) if the policemen don't come?",
                    ["happens", "will happen"],
                    "will happen",
                ),
                (
                    "If she doesn't work hard, she (doesn't get / won't get) high salary.",
                    ["doesn't get", "won't get"],
                    "won't get",
                ),
                (
                    "Your car may be stolen if you (leave / will leave) it unlocked.",
                    ["leave", "will leave"],
                    "leave",
                ),
                (
                    "You can't study online if you (don't have / won't have) Internet.",
                    ["don't have", "won't have"],
                    "don't have",
                ),
                (
                    "There (won't be / aren't) any flowers if my sister doesn't take care of it every day.",
                    ["won't be", "aren't"],
                    "won't be",
                ),
            ],
        )
    )

    skip(skipped, 6, "if/unless fill ambiguous without answer key", "G Exercise 9 Write if or unless")
    skip(skipped, 6, "sentence word-order / rearrange", "W Exercise 1 Reorder the words")

    # G Ex10 Unless
    u6 += [
        gr(
            "If they don't practise a lot, they will lose the game.",
            "Unless",
            [
                "they practise a lot, they will lose the game.",
                "they practice a lot, they will lose the game.",
            ],
        ),
        gr(
            "I'll miss the train if I don't go now.",
            "Unless",
            ["I go now, I'll miss the train.", "I go now, I will miss the train."],
        ),
        gr(
            "If she doesn't answer the phone, leave her a message.",
            "Unless",
            ["she answers the phone, leave her a message.", "she answers the phone, leave her a message"],
        ),
        gr(
            "If you don't pay the bill, I'll call the police.",
            "Unless",
            ["you pay the bill, I'll call the police.", "you pay the bill, I will call the police."],
        ),
        gr(
            "If he doesn't work hard, he won't pass the examination.",
            "Unless",
            [
                "he works hard, he won't pass the examination.",
                "he works hard, he will not pass the examination.",
            ],
        ),
    ]

    # G Ex11 type 1 — curated clearest
    u6 += [
        gr(
            "Turn off all the lights and you will not pay more money.",
            "If",
            [
                "you turn off all the lights, you will not pay more money.",
                "you turn off all the lights, you won't pay more money.",
            ],
        ),
        gr(
            "Unless she wears warm clothes, she will have a cold.",
            "If",
            [
                "she doesn't wear warm clothes, she will have a cold.",
                "she does not wear warm clothes, she will have a cold.",
            ],
        ),
        gr(
            "Be careful or you may have an accident.",
            "If",
            [
                "you aren't careful, you may have an accident.",
                "you are not careful, you may have an accident.",
                "you don't be careful, you may have an accident.",
            ],
        ),
        gr(
            "Stay here and you will feel safe.",
            "If",
            ["you stay here, you will feel safe.", "you stay here, you'll feel safe."],
        ),
        gr(
            "Pay the electricity bill today or your electricity will be cut off.",
            "If",
            [
                "you don't pay the electricity bill today, your electricity will be cut off.",
                "you do not pay the electricity bill today, your electricity will be cut off.",
            ],
        ),
        gr(
            "Stop smoking otherwise your cough may be worse.",
            "If",
            [
                "you don't stop smoking, your cough may be worse.",
                "you do not stop smoking, your cough may be worse.",
            ],
        ),
        gr(
            "Unless we use less fossil fuel, they will be run out soon.",
            "If",
            [
                "we don't use less fossil fuel, they will run out soon.",
                "we do not use less fossil fuel, they will be run out soon.",
            ],
        ),
        gr(
            "Unless it stops raining today, we may be faced with a serious flood.",
            "If",
            [
                "it doesn't stop raining today, we may be faced with a serious flood.",
                "it does not stop raining today, we may face a serious flood.",
            ],
        ),
        gr(
            "Do morning exercises regularly, your body will be fitter.",
            "If",
            [
                "you do morning exercises regularly, your body will be fitter.",
                "you do morning exercise regularly, your body will be fitter.",
            ],
        ),
        gr(
            "Unless we use renewable energy, we will have nothing for the future generation.",
            "If",
            [
                "we don't use renewable energy, we will have nothing for the future generation.",
                "we do not use renewable energy, we will have nothing for the future generation.",
            ],
        ),
        gr(
            "The climate will change unless we reduce the use of non-renewable energy.",
            "If",
            [
                "we don't reduce the use of non-renewable energy, the climate will change.",
                "we do not reduce the use of non-renewable energy, the climate will change.",
            ],
        ),
        gr(
            "Lock all the doors and no one can break into your house.",
            "If",
            [
                "you lock all the doors, no one can break into your house.",
                "you lock all the doors, no one will break into your house.",
            ],
        ),
    ]
    skip(skipped, 6, "awkward / low confidence rewrite", "G Ex11 #4 Phone your parents…")
    skip(skipped, 6, "awkward / low confidence rewrite", "G Ex11 #5 Unless she whispers…")
    skip(skipped, 6, "already type-1 / no transform needed", "G Ex11 #15 If we continue hunting…")

    # G Ex12 unless
    u6 += [
        gr(
            "If you don't do this now, you will regret it.",
            "Unless",
            ["you do this now, you will regret it.", "you do this now, you'll regret it."],
        ),
        gr(
            "I will feel bored if my best friend doesn't come to the party with me.",
            "I",
            [
                "will feel bored unless my best friend comes to the party with me.",
                "will feel bored unless my best friend comes to the party.",
            ],
        ),
        gr(
            "We won't talk to her if she doesn't apologize.",
            "We",
            ["won't talk to her unless she apologizes.", "will not talk to her unless she apologises."],
        ),
        gr(
            "The baby will cry louder if they don't give him some toys.",
            "The baby",
            ["will cry louder unless they give him some toys.", "will cry louder unless they give him some toys"],
        ),
        gr(
            "If she doesn't promise to come back home early, her father won't let her go.",
            "Unless",
            [
                "she promises to come back home early, her father won't let her go.",
                "she promises to come back home early, her father will not let her go.",
            ],
        ),
        gr(
            "If we don't buy a good map, we will be lost.",
            "Unless",
            ["we buy a good map, we will be lost.", "we buy a good map, we'll be lost."],
        ),
        gr(
            "If Mary doesn't have enough money, she won't buy that car.",
            "Unless",
            [
                "Mary has enough money, she won't buy that car.",
                "Mary has enough money, she will not buy that car.",
            ],
        ),
        gr(
            "You can't have many job opportunities if you don't have an IELTS degree.",
            "You",
            [
                "can't have many job opportunities unless you have an IELTS degree.",
                "cannot have many job opportunities unless you have an IELTS degree.",
            ],
        ),
        gr(
            "If you don't eat less, you can't lose weight.",
            "Unless",
            ["you eat less, you can't lose weight.", "you eat less, you cannot lose weight."],
        ),
        gr(
            "If he doesn't speak English well, he can't take part in this English contest.",
            "Unless",
            [
                "he speaks English well, he can't take part in this English contest.",
                "he speaks English well, he cannot take part in this English contest.",
            ],
        ),
    ]

    # Final If/Unless pairs
    u6 += [
        gr(
            "If you eat an apple a day, you will stay healthy. (Unless)",
            "Unless",
            [
                "you eat an apple a day, you won't stay healthy.",
                "you eat an apple a day, you will not stay healthy.",
            ],
        ),
        gr(
            "You will run out of money if you don't stop wasting it. (Unless)",
            "Unless",
            [
                "you stop wasting money, you will run out of it.",
                "you stop wasting it, you will run out of money.",
            ],
        ),
        gr(
            "Don't call me unless it is an emergency. (IF)",
            "If",
            [
                "it isn't an emergency, don't call me.",
                "it is not an emergency, don't call me.",
                "it isn't an emergency, you shouldn't call me.",
            ],
        ),
        gr(
            "James will not pass the test unless he studies harder. (IF)",
            "If",
            [
                "James doesn't study harder, he will not pass the test.",
                "James does not study harder, he won't pass the test.",
            ],
        ),
        gr(
            "If Jane finishes her work before 6 pm, she will dine out with her friends. (Unless)",
            "Unless",
            [
                "Jane finishes her work before 6 pm, she won't dine out with her friends.",
                "Jane finishes her work before 6 pm, she will not dine out with her friends.",
            ],
        ),
        gr(
            "My brother won't go travelling this summer if he doesn't stay healthy. (Unless)",
            "Unless",
            [
                "my brother stays healthy, he won't go travelling this summer.",
                "he stays healthy, my brother won't go travelling this summer.",
            ],
        ),
    ]
    units[6] = u6

    return {"units": {str(k): v for k, v in units.items()}, "skipped": skipped}


def main():
    data = build()
    out = Path(__file__).with_name("lop8-writing-content.json")
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    for u, items in sorted(data["units"].items(), key=lambda x: int(x[0])):
        g = sum(1 for i in items if i["game"] == "grammar")
        cc = sum(1 for i in items if i["game"] == "choose_and_circle")
        cc_items = sum(
            len(i.get("items") or []) for i in items if i["game"] == "choose_and_circle"
        )
        mc_n = sum(1 for i in items if i["game"] == "quiz" and i["type"] == "multiple_choice")
        fb = sum(1 for i in items if i["game"] == "quiz" and i["type"] == "fill_blank")
        wf_n = sum(1 for i in items if i["game"] == "quiz" and i["type"] == "word_form")
        print(
            f"Unit {u}: total={len(items)} grammar={g} choose_and_circle={cc} "
            f"(items={cc_items}) mc={mc_n} fill={fb} word_form={wf_n}"
        )
    print(f"Skipped groups: {len(data['skipped'])}")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
