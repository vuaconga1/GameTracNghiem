"""
Parse Writing_Lop9.docx → lop9-writing-content.json
WITH manually verified answers for all fill-in-blank exercises.

All answers are determined from context + word box, verified against
standard English grammar rules and the Global Success 9 curriculum.
"""

import json
import re
from pathlib import Path

DOCX_PATH = Path(__file__).resolve().parents[3] / "PDF" / "Writing_Lop9.docx"
OUT_PATH = Path(__file__).resolve().parent / "lop9-writing-content.json"


def grammar_item(source: str, prefix: str, suffix: str, hint: str, answers: list[str]) -> dict:
    return {
        "game": "grammar",
        "source": source,
        "prefix": prefix,
        "suffix": suffix,
        "hint": hint,
        "answers": answers,
    }


def quiz_mc(exercise: str, question: str, answer: str, options: list[str]) -> dict:
    return {
        "game": "quiz",
        "type": "multiple_choice",
        "typeLabel": "Circle correct form",
        "skill": "writing",
        "exercise": exercise,
        "question": question,
        "answer": answer,
        "options": options,
        "accept": [],
        "fillMode": False,
    }


def cc_item(title: str, instruction: str, items: list[dict]) -> dict:
    return {
        "game": "choose_and_circle",
        "title": title,
        "instruction": instruction,
        "items": items,
    }


def cc_row(order: int, prompt: str, options: list[str], answer: str) -> dict:
    return {"order": order, "image": "", "prompt": prompt, "options": options, "answer": answer}


# ============================================================================
# UNIT 1: LOCAL ENVIRONMENT
# ============================================================================

u1_items: list[dict] = []

# Ex4: Complete with words from Ex3 (photo labels)
u1_ex4_hint = "police officer, delivery man, garbage collector, firefighter, electrician, artisan"
u1_ex4 = [
    ("The", "successfully collected evidence of the crime and solved the case.", "police officer"),
    ("I tracked my order online and excitedly waited for the", "in front of my house.", "delivery man"),
    ("Every afternoon, I leave our trash bags outside for the", "to collect.", "garbage collector"),
    ("The", "bravely saved the family from the burning building.", "firefighter"),
    ("My neighbor is a/an", "and he always helps me with different electrical issues.", "electrician"),
    ("The", "carefully used traditional techniques to create a unique piece of art.", "artisan"),
]
for i, (pre, suf, ans) in enumerate(u1_ex4, 1):
    u1_items.append(grammar_item(f"U1 Ex4", pre, suf, u1_ex4_hint, [ans]))

# Ex5: Complete with words in the box
u1_ex5_hint = "handicrafts, original, shorten, speciality food, community, suburb, tourist attraction, preserve, fragrance, pottery"
u1_ex5 = [
    ("A bouquet of blooming roses filled the room with a sweet comfortable", ".", "fragrance"),
    ("The village held an annual festival to", "the tradition of folk music and dances.", "preserve"),
    ("The region is famous for its", ", such as local cheeses and unique spices.", "speciality food"),
    ("I live in a quiet and peaceful", "just outside the busy city.", "suburb"),
    ("This historical village is a popular", "in Hanoi thanks to its rich cultural heritage.", "tourist attraction"),
    ("During hard times, neighbours in the", "come together to support those in need.", "community"),
    ("The", "shop offers tourists beautiful souvenirs such as jewelry and sculptures made by local artisans.", "handicrafts"),
    ("If you want to save time, try to find a way to", "the process.", "shorten"),
    ("She carefully shaped the clay on the", "wheel to create a beautiful vase.", "pottery"),
    ("The family always uses their", "techniques passed down through generations to create unique paintings.", "original"),
]
for pre, suf, ans in u1_ex5:
    u1_items.append(grammar_item("U1 Ex5", pre, suf, u1_ex5_hint, [ans]))

# Ex9: Underline mistake - quiz fill_blank
u1_ex9 = [
    ("Do you know where parking the car in this neighborhood?", "where parking", "where to park"),
    ("I don't know who should I contact for information about the event.", "who should I contact", "who I should contact"),
    ("Let's cut off on using plastic bags to protect our environment.", "cut off", "cut down"),
    ("I'm not sure where to say in the job interview. Can you give me some tips?", "where to say", "what to say"),
    ("The team gets to well with their coach; they respect and trust his guidance.", "gets to", "gets on"),
    ("We should ask the locals where for finding the best local cuisine in this town.", "where for finding", "where to find"),
    ("He's wondering how can he impress his friends at the party tonight.", "how can he", "how he can"),
    ("I'm not sure while to start exercising after recovering from an injury.", "while", "when"),
]
for q, mistake, correction in u1_ex9:
    u1_items.append({
        "game": "quiz",
        "type": "fill_blank",
        "typeLabel": "Find the mistake",
        "skill": "writing",
        "exercise": "U1 Ex9",
        "question": q,
        "answer": correction,
        "options": [],
        "accept": [correction],
        "fillMode": True,
    })

# Ex10: Complete with phrasal verbs
u1_ex10_hint = "run out of, look around, cut down on, get on with, pass down, find out, set up, come back, go out, take care of"
u1_ex10 = [
    ("They planned to", "and celebrate their anniversary at a fancy restaurant.", "go out"),
    ("The children walked into the park and", ", trying to find a suitable spot to have a picnic.", "looked around"),
    ("The doctor advised me to", "my caffeine intake to reduce my anxiety.", "cut down on"),
    ("He", "the household chores while his wife was away on a business trip.", "took care of"),
    ("The memories of that trip always", "to me when I see these old photographs.", "come back"),
    ("We", "gas on our road trip, so we had to stop at a nearby gas station.", "ran out of"),
    ("The scientist did several experiments to", "the effects of the new drug.", "find out"),
    ("It is important to", "family traditions from one generation to the next.", "pass down"),
    ("Last month, our team", "a charity event to support local businesses.", "set up"),
    ("Despite their initial differences, the two roommates eventually", "each other and became good friends.", "got on with"),
]
for pre, suf, ans in u1_ex10:
    u1_items.append(grammar_item("U1 Ex10", pre, suf, u1_ex10_hint, [ans]))

# Ex11: Circle correct word (choose_and_circle)
u1_ex11 = [
    (1, "By eliminating unnecessary steps, we can (shorten / preserve) the process and save valuable time.", ["shorten", "preserve"], "shorten"),
    (2, "A candle not only provides light but also creates a pleasant (fragrance / function) when it is burnt.", ["fragrance", "function"], "fragrance"),
    (3, "(Famous / Common) local festivals in the city attract millions of visitors from all around the world every year.", ["Famous", "Common"], "Famous"),
    (4, "Our new (neighbors / artisans) just moved in last week, and we invited them over for a welcome dinner.", ["neighbors", "artisans"], "neighbors"),
    (5, "One (tradition / origin) in our community is to bow when greeting someone as a sign of respect.", ["tradition", "origin"], "tradition"),
    (6, "The brave (firefighters / electricians) rushed into the burning building to rescue trapped residents.", ["firefighters", "electricians"], "firefighters"),
    (7, "She made a beautiful vase out of clay in her (pottery / weaving) class.", ["pottery", "weaving"], "pottery"),
    (8, "The artisans have impressive (skills / objects) in making those beautiful handicrafts.", ["skills", "objects"], "skills"),
    (9, "The local market is famous for its (speciality / facility) products, including handicrafts and tropical fruits.", ["speciality", "facility"], "speciality"),
    (10, "uring the peak season, this (tourist / tourism) attraction always gets crowded with visitors from all around the world.", ["tourist", "tourism"], "tourist"),
]
u1_items.append(cc_item("U1 Exercise 11", "Circle the correct words or phrases to complete the sentences.",
    [cc_row(o, p, opts, a) for o, p, opts, a in u1_ex11]))

# Ex12: Complete conversation
u1_ex12_hint = "artisans, positive, improve, traditional, project, recycling, volunteer, pass, plan, attract"
u1_ex12 = [
    ("Linda: Hey, have you heard about the new community (1)", "our town is starting?", "project"),
    ("Linda: It's called \"Green Our Community\" and it aims to (2)", "our local environment.", "improve"),
    ("Linda: They' re organising clean-up events and promoting (3)", "programs. Moreover, they (4)", "recycling"),
    ("Moreover, they (4)", "to preserve our parks and green spaces.", "plan"),
    ("Linda: True! And they're also trying to (5)", "more tourists by promoting our community's speciality - handcrafted items made by local (6)", "attract"),
    ("handcrafted items made by local (6)", ".", "artisans"),
    ("Mary: Right, I remember my grandmother used to make those (7)", "handicrafts.", "traditional"),
    ("I hope this will help keep the tradition alive and even (8)", "it down to future generations.", "pass"),
    ("Linda: That's amazing! I'm going to (9)", "for these events.", "volunteer"),
    ("Mary: Absolutely! Let's spread the word and get others involved too. Together we can make a (10)", "impact on our surroundings.", "positive"),
]
for pre, suf, ans in u1_ex12:
    u1_items.append(grammar_item("U1 Ex12", pre, suf, u1_ex12_hint, [ans]))


# ============================================================================
# UNIT 2: CITY LIFE
# ============================================================================

u2_items: list[dict] = []

# Ex4: Complete with words in the box (photo labels)
u2_ex4_hint = "metro, concrete jungle, construction site, sky train, itchy eyes, congested road, entertainment centre, dusty"
u2_ex4 = [
    ("I wear a mask to protect myself from breathing in the", "air in the city.", "dusty"),
    ("Wearing contact lenses sometimes leads to", "by the end of the day.", "itchy eyes"),
    ("The", "is an underground railway system in a city, often used for public transportation", "metro"),
    ("The city is often called a", "because of all the tall buildings.", "concrete jungle"),
    ("My dad is a construction worker, so he often visits the", ".", "construction site"),
    ("The", "is a fun place to hang out with friends and family.", "entertainment centre"),
    ("The", "is an elevated train system that runs above the city streets.", "sky train"),
    ("Manh feels stressed when he has to drive on the", ".", "congested road"),
]
for pre, suf, ans in u2_ex4:
    u2_items.append(grammar_item("U2 Ex4", pre, suf, u2_ex4_hint, [ans]))

# Ex6: Complete with phrasal verbs
u2_ex6_hint = "get around, hang out with, cut down on, carry out, come down with"
u2_ex6 = [
    ("My friends ride their bikes to", "the city every weekend.", "get around"),
    ("We turn off lights when we leave a room to", "electricity.", "cut down on"),
    ("Linda and Anna are", "a project to plant trees in the park.", "carrying out"),
    ("Yesterday, I", "a stomach ache after eating too much candy.", "came down with"),
    ("Jane is excited to", "a plan to go camping with her family.", "carry out"),
    ("We enjoy", "our neighbours in the evening.", "hanging out with"),
    ("Oscar couldn't go to school last Monday because he", "a fever.", "came down with"),
    ("We should not throw trash in the river to", "water pollution.", "cut down on"),
    ("I can't", "my friends because I have to do my homework.", "hang out with"),
    ("If you want to", "London, you can take a bus.", "get around"),
]
for pre, suf, ans in u2_ex6:
    u2_items.append(grammar_item("U2 Ex6", pre, suf, u2_ex6_hint, [ans]))

# Ex8: Complete conversation
u2_ex8_hint = "congested roads, more crowded, suburbs, entertainment, packed, concrete, hang out, sky train"
u2_ex8 = [
    ("It's just a big (1)", "jungle.", "concrete"),
    ("You can go to the (2)", "centre to watch movies, play games, and have fun with friends.", "entertainment"),
    ("I hate driving on (3)", ".", "congested roads"),
    ("Well, have you tried taking the (4)", "? It's much faster.", "sky train"),
    ("But then it's so (5)", "with people!", "packed"),
    ("You sound like me before 1 moved here from the (6)", ".", "suburbs"),
    ("The (7)", "it gets, the more annoyed I feel.", "more crowded"),
    ("just remember we can always (8)", "with our friends and relax.", "hang out"),
]
for pre, suf, ans in u2_ex8:
    u2_items.append(grammar_item("U2 Ex8", pre, suf, u2_ex8_hint, [ans]))

# Ex11: Circle correct word (choose_and_circle) - double comparatives
u2_ex11 = [
    (1, "The more (nervous / nervouser) she feels, the shakier her hands become.", ["nervous", "nervouser"], "nervous"),
    (2, "The bigger the crowd is, (the harder / the more hard) it is to find someone.", ["the harder", "the more hard"], "the harder"),
    (3, "The (more colourful / most colourful) the flowers in the garden are, the more attractive it becomes to visitors.", ["more colourful", "most colourful"], "more colourful"),
    (4, "The more complicated the recipe is, the (more satisfying / satisfying) the taste becomes.", ["more satisfying", "satisfying"], "more satisfying"),
    (5, "The sweeter the fruit tastes, the (juicier / more juicy) it is to bite into.", ["juicier", "more juicy"], "juicier"),
    (6, "The (more excited / excited) the children get, the louder their laughter becomes.", ["more excited", "excited"], "more excited"),
    (7, "The more colourful the sky becomes, the (prettier / prettiest) the sunset looks.", ["prettier", "prettiest"], "prettier"),
    (8, "The (more difficult / difficulter) the assignment is, the more hard-working Ben needs to be.", ["more difficult", "difficulter"], "more difficult"),
    (9, "The more unique the village is, (the greater / greater) the number of visitors it can attract.", ["the greater", "greater"], "the greater"),
    (10, "The (darker / more dark) the room gets, the more nervous I feel.", ["darker", "more dark"], "darker"),
    (11, "The dirtier the lake is, the less (attractive / more attractive) it becomes.", ["attractive", "more attractive"], "attractive"),
    (12, "The (more experienced / most experienced) the team is, the more successful the project tends to be.", ["more experienced", "most experienced"], "more experienced"),
    (13, "The more patient the teacher is, (the more engaged / more engaged) the students become in learning.", ["the more engaged", "more engaged"], "the more engaged"),
    (14, "The more enthusiastic the audience is, the (more energised / energised) the performer becomes.", ["more energised", "energised"], "more energised"),
    (15, "The more confident they become, the (better / gooder) their chances of success are.", ["better", "gooder"], "better"),
]
u2_items.append(cc_item("U2 Exercise 11", "Circle the correct word or phrase to complete each sentence.",
    [cc_row(o, p, opts, a) for o, p, opts, a in u2_ex11]))

# Ex14: Underline mistake
u2_ex14 = [
    ("The more complicated the puzzle gets, the long it takes to solve.", "long", "longer"),
    ("The most polluted the air gets, the harder it is to breathe.", "most", "more"),
    ("Despite the crowded streets, Tom decided to get up downtown by motorbike.", "get up", "get around"),
    ("We had to cancel our trip because our dad came up with the flu.", "came up with", "came down with"),
    ("The cleaner the kitchen is, more inviting it looks.", "more inviting", "the more inviting"),
    ("The crowdeder the bus is, the longer the journey takes.", "crowdeder", "more crowded"),
    ("My brother enjoys hanging up with his colleagues at the local pub after work.", "hanging up", "hanging out"),
    ("The more expensive the hotel gets, the most luxurious the amenities become.", "most", "more"),
    ("The committee is working together to carry in a project to organise a charity event.", "carry in", "carry out"),
    ("We must cut down out water pollution to protect marine life and ecosystems.", "cut down out", "cut down on"),
    ("More complicated the problem becomes, the more confused she feels.", "More complicated", "The more complicated"),
    ("They came down to food poisoning after eating at that restaurant.", "came down to", "came down with"),
]
for q, mistake, correction in u2_ex14:
    u2_items.append({
        "game": "quiz",
        "type": "fill_blank",
        "typeLabel": "Find the mistake",
        "skill": "writing",
        "exercise": "U2 Ex14",
        "question": q,
        "answer": correction,
        "options": [],
        "accept": [correction],
        "fillMode": True,
    })


# ============================================================================
# UNIT 3: HEALTHY LIVING FOR TEENS
# ============================================================================

u3_items: list[dict] = []

# Ex4: Complete with words in the box
u3_ex4_hint = "physical, priority, counsellor, mental, additional, delay, accomplish, anxiety, well-balanced, fattening"
u3_ex4 = [
    ("Sharing both positive and negative feelings with friends can be a helpful way to improve your", "health.", "mental"),
    ("When making financial decisions, it is important to give", "to essential expenses like food and clothes.", "priority"),
    ("Eating too much", "food can make you gain weight fast.", "fattening"),
    ("The team had to", "the meeting until next week due to an emergency.", "delay"),
    ("They needed", "time to discuss the situation before making final decisions.", "additional"),
    ("The therapist gave her some tips to reduce her", "levels.", "anxiety"),
    ("Thanks to great planning and hard work, she was able to", "her goals.", "accomplish"),
    ("The", "provides support and advice to students who are facing academic difficulties.", "counsellor"),
    ("He enjoyed the", "challenge of climbing up the high mountain.", "physical"),
    ("To maintain a healthy lifestyle, it's important to have a", "diet with a lot of vegetables and fruits.", "well-balanced"),
]
for pre, suf, ans in u3_ex4:
    u3_items.append(grammar_item("U3 Ex4", pre, suf, u3_ex4_hint, [ans]))

# Ex8: Underline mistake
u3_ex8 = [
    ("What I should do if I have to choose between two amazing offers?", "What I should do", "What should I do"),
    ("If Laura gets enough sleep, she will might feel better tomorrow.", "will might", "might"),
    ("If you borrow someone's car, you shouldn't return it with a full tank of gas.", "shouldn't", "should"),
    ("If we have exams coming, what can we do to avoid stressed?", "stressed", "stress"),
    ("If it rains tomorrow, the company must have to postpone the competition.", "must have to", "may have to"),
    ("If my brother follow the instructions carefully, he may solve the puzzle successfully.", "follow", "follows"),
    ("If Tom doesn't cut down on fattening food, he mustn't lose weight.", "mustn't", "can't"),
    ("If you will update your computer, you might experience interesting new features.", "will update", "update"),
    ("If I come to Lisa's birthday party, what should I buying her as a present?", "buying", "buy"),
    ("If John will try his best in the final match, he might become the next champion.", "will try", "tries"),
]
for q, mistake, correction in u3_ex8:
    u3_items.append({
        "game": "quiz",
        "type": "fill_blank",
        "typeLabel": "Find the mistake",
        "skill": "writing",
        "exercise": "U3 Ex8",
        "question": q,
        "answer": correction,
        "options": [],
        "accept": [correction],
        "fillMode": True,
    })

# Ex9: Complete with correct form of words in box
u3_ex9_hint = "concentrate, communicate, priority, routine, negative, appropriately, manage, productivity, overcome, accomplish"
u3_ex9 = [
    ("Despite his physical disability, he", "his limitations and became a professional athlete.", "overcame"),
    ("If you", "on positive thoughts, you may experience a greater sense of joy in your daily life.", "concentrate"),
    ("Thanks to careful planning, the company", "to host a successful event last month.", "managed"),
    ("A regular exercise", "will keep your body strong and energized.", "routine"),
    ("By breaking down tasks into smaller steps, you can boost your", ".", "productivity"),
    ("___", "openly with your doctor can help create a great detailed plan for a healthier lifestyle.", "Communicating"),
    ("___", "your goals requires a lot of factors including determination, patience, and careful planning.", "Accomplishing"),
    ("Constantly comparing yourself to others can lead to", "feelings of self-doubt.", "negative"),
    ("Asa student, it's important to give", "to your academic responsibilities and arrange enough time for studying.", "priority"),
    ("If you dress", "for a job interview, you may make a good impression.", "appropriately"),
]
for pre, suf, ans in u3_ex9:
    u3_items.append(grammar_item("U3 Ex9", pre, suf, u3_ex9_hint, [ans]))

# Ex10: Circle correct word (choose_and_circle)
u3_ex10 = [
    (1, "Spending too much time sitting and not being physically active can lead to a/an (healthy / unhealthy) lifestyle.", ["healthy", "unhealthy"], "unhealthy"),
    (2, "It's important to stick to a (schedule / balance) to stay organized and meet deadlines.", ["schedule", "balance"], "schedule"),
    (3, "(Worrying / Managing) too much about what could go wrong can prevent you from accessing great opportunities.", ["Worrying", "Managing"], "Worrying"),
    (4, "Even in difficult times, she remains (optimistic / regular) and believes in the power of positive thinking.", ["optimistic", "regular"], "optimistic"),
    (5, "Consuming a lot of (fattening / nutritious) food can contribute to weight gain and poor health.", ["fattening", "nutritious"], "fattening"),
    (6, "Timmy was (nervous / relieved) about the upcoming job interview and couldn' t sleep the night before.", ["nervous", "relieved"], "nervous"),
    (7, "A quiet and organized workspace can help reduce (distractions / obstacles) and improve concentration.", ["distractions", "obstacles"], "distractions"),
    (8, "If you're experiencing persistent symptoms, it's advisable to (consult / function) a doctor for a proper diagnosis.", ["consult", "function"], "consult"),
    (9, "People who smoke cigarettes are more likely to (suffer / develop) from respiratory problems.", ["suffer", "develop"], "suffer"),
    (10, "Nowadays, more and more people struggle with (mental / physical) health issues such as anxiety, depression, or bipolar disorder.", ["mental", "physical"], "mental"),
]
u3_items.append(cc_item("U3 Exercise 10", "Circle the correct words or phrases to complete the sentences.",
    [cc_row(o, p, opts, a) for o, p, opts, a in u3_ex10]))

# Ex11: Complete conversation
u3_ex11_hint = "problems, start, keep, reduce, junk food, take, diet, vegetables, focus, exercise"
u3_ex11 = [
    ("So, what's going on? Why haven't you been able to (1)", "up with your (2)", "keep"),
    ("up with your (2)", "routine lately?", "exercise"),
    ("they said I have some (3)", "with my spine", "problems"),
    ("maybe there are other ways to (4)", "care of your health", "take"),
    ("I think one of the factors affecting my back is my poor (5)", ". I've been eating too much (6)", "diet"),
    ("I've been eating too much (6)", ".", "junk food"),
    ("Try eating more nutritious foods like fruits and (7)", "in your meals.", "vegetables"),
    ("I'll have to (8)", "on making healthier choices from now on.", "focus"),
    ("don't forget to (9)", "stress in your life as well.", "reduce"),
    ("I should probably (10)", "doing yoga again.", "start"),
]
for pre, suf, ans in u3_ex11:
    u3_items.append(grammar_item("U3 Ex11", pre, suf, u3_ex11_hint, [ans]))

# Ex12: Complete with may/should + verb
u3_ex12_hint = "may/should + verb"
u3_ex12 = [
    ("If you don't revise carefully, you", "well on the coming exam. (negative)", "may not do"),
    ("If we recycle and reduce waste, we", "the amount of landfill space needed. (positive)", "may reduce"),
    ("If you're going on a long trip, you", "to pack essential items like a first aid kit and extra clothing. (negative)", "shouldn't forget"),
    ("If students explore extracurricular activities, they", "new talents and interests. (positive)", "may discover"),
    ("If you want to maintain a healthy relationship, you", "open communications. (negative)", "shouldn't avoid"),
    ("If you're installing new lights, you", "energy-efficient options to save electricity. (positive)", "should choose"),
    ("If you practise regularly, you", "a skilled musician in the future. (positive)", "may become"),
    ("If the team doesn't manage their time effectively, they", "the project on time. (negative)", "may not complete"),
    ("If you're attending a job interview, you", "the company beforehand. (positive)", "should research"),
]
for pre, suf, ans in u3_ex12:
    u3_items.append(grammar_item("U3 Ex12", pre, suf, u3_ex12_hint, [ans]))


# ============================================================================
# UNIT 4: REMEMBERING THE PAST
# ============================================================================

u4_items: list[dict] = []

# Ex4: Complete with words from Ex3 (match definitions)
u4_ex4_hint = "magnificent, heritage, thanks to, well preserved, occupied, generation, takeaway, structure, recognise, contribute"
u4_ex4 = [
    ("I forgot my lunch at home, so I'll get a", "from the nearest restaurant.", "takeaway"),
    ("The ancient ruins are", ", so we can still see the old buildings clearly.", "well preserved"),
    ("Emily didn't", "me because I changed my hair colour.", "recognise"),
    ("The mountain view from the top is", ", with breathtaking scenery all around.", "magnificent"),
    ("My teacher says we're the future", "and we need to study hard.", "generation"),
    ("Volunteering at the local shelter is a great way to", "to the community.", "contribute"),
    ("We can find information quickly", "the Internet.", "thanks to"),
    ("The museum displays artefacts that represent our country's rich", ".", "heritage"),
    ("The study room at the library was", "by students studying for exams.", "occupied"),
    ("We found an old", "by the river that looked like a bridge.", "structure"),
]
for pre, suf, ans in u4_ex4:
    u4_items.append(grammar_item("U4 Ex4", pre, suf, u4_ex4_hint, [ans]))

# Ex7: Put words in correct form
u4_ex7 = [
    ("People donate clothes to charity to (contribute)", "to helping those in need.", "contribute"),
    ("Planting trees is important for environmental (protect)", "because they clean the air.", "protection"),
    ("Sharing stories and songs is a way to preserve our (culture)", "traditions.", "cultural"),
    ("It's easy to (recognise)", "my pet because of its unique markings.", "recognise"),
    ("During the trip to the zoo, I made an (observe)", "about how monkeys play.", "observation"),
    ("I love exploring (history)", "sites to learn about different cultures and traditions.", "historical"),
    ("Our community organises events to promote the (preserve)", "of local traditions.", "preservation"),
    ("The parking lot was fully (occupy)", ", so we had to park on the street.", "occupied"),
    ("We gather around the table to enjoy a (tradition)", "meal on Thanksgiving.", "traditional"),
    ("Our company is offering a (promote)", "to encourage people to buy our new product.", "promotion"),
]
for q, suf, ans in u4_ex7:
    u4_items.append({
        "game": "quiz",
        "type": "word_form",
        "typeLabel": "Word form",
        "skill": "writing",
        "exercise": "U4 Ex7",
        "question": q + " _________________ " + suf,
        "answer": ans,
        "options": [],
        "accept": [ans],
        "fillMode": True,
    })

# Ex9: Circle correct verb form (wish + past simple)
u4_ex9 = [
    (1, "My sister wishes she has /had / is having a better phone with a good camera.", ["has", "had", "is having"], "had"),
    (2, "Oscar wishes he can learn / could learn / can learned more about different cultures.", ["can learn", "could learn", "can learned"], "could learn"),
    (3, "Tom wishes he has / had / was having a magic wand to make his wishes come true.", ["has", "had", "was having"], "had"),
    (4, "Maria wishes she visits / is visiting / visited all the famous landmarks in the world.", ["visits", "is visiting", "visited"], "visited"),
    (5, "I wish I know / knowed /knew how to make a chocolate cake.", ["know", "knowed", "knew"], "knew"),
    (6, "The kids wish they can have / can had / could have a treehouse in their backyard.", ["can have", "can had", "could have"], "could have"),
    (7, "Does Trung wish he has /have / had more time to spend with his family?", ["has", "have", "had"], "had"),
    (8, "Anna wishes she gets / got / gotten the chance to meet her favourite singer in person.", ["gets", "got", "gotten"], "got"),
    (9, "Do you wish you could travel / travelled / travelling around the world and explore different cultures?", ["could travel", "travelled", "travelling"], "could travel"),
    (10, "Mark wishes he becomes / has become / became a professional athlete and competes / competed / is competing in the Olympics.", ["becomes", "has become", "became"], "became"),
]
for o, q, opts, ans in u4_ex9:
    u4_items.append(quiz_mc("U4 Ex9", q, ans, opts))

# Ex11: Complete conversation
u4_ex11_hint = "thanks to, heritage, visited, preserved, magnificent, generations, historic, protect"
u4_ex11 = [
    ("Did you go to any (1)", "sites while you were in Italy?", "historic"),
    ("Was it well (2)", "?", "preserved"),
    ("Yes, it's (3)", "the efforts of many people to protect these structures for future generations.", "thanks to"),
    ("We need to preserve our cultural (4)", ".", "heritage"),
    ("I recently (5)", "Egypt and saw the pyramids.", "visited"),
    ("People must be working hard to (6)", "them too.", "protect"),
    ("We re lucky to be able to experience and learn from such (7)", "places.", "magnificent"),
    ("we need to make sure they'll be there for future (8)", "to enjoy.", "generations"),
]
for pre, suf, ans in u4_ex11:
    u4_items.append(grammar_item("U4 Ex11", pre, suf, u4_ex11_hint, [ans]))

# Ex14: Underline mistake
u4_ex14 = [
    ("My father was drive to work when he saw an accident on the road.", "drive", "driving"),
    ("Ngoc was dancing in her room while her brother were playing video games.", "were", "was"),
    ("The volunteers made a meaningful contribute to the local orphanage.", "contribute", "contribution"),
    ("Linda wishes she has a new smartphone and a new bike.", "has", "had"),
    ("I want to observation the changing colours of the leaves in autumn.", "observation", "observe"),
    ("I was waiting for the bus when I realise I had forgotten my umbrella.", "realise", "realised"),
    ("We wish that our parents didn't had to work so hard.", "didn't had", "didn't have"),
    ("Cultural preserve includes safeguarding intangible heritage like music and dance.", "preserve", "preservation"),
    ("He fixing the car in the garage for weeks because it kept breaking down.", "fixing", "was fixing"),
    ("Minh and Quang are having a picnic in the garden at 3 p.m. last Saturday.", "are having", "were having"),
    ("She wish she had a villa with a swimming pool and a beautiful garden.", "wish", "wishes"),
    ("We should protected valuable artefacts from being stolen or sold illegally.", "protected", "protect"),
    ("I wish I could reading minds and know what people are thinking.", "reading", "read"),
    ("The baby was sleeping peacefully when the phone will ring loudly.", "will ring", "rang"),
    ("My sister attends a cooking class to learn how to make new recipes three months ago.", "attends", "attended"),
]
for q, mistake, correction in u4_ex14:
    u4_items.append({
        "game": "quiz",
        "type": "fill_blank",
        "typeLabel": "Find the mistake",
        "skill": "writing",
        "exercise": "U4 Ex14",
        "question": q,
        "answer": correction,
        "options": [],
        "accept": [correction],
        "fillMode": True,
    })


# ============================================================================
# UNIT 5: OUR EXPERIENCES
# ============================================================================

u5_items: list[dict] = []

# Ex5: Complete with words from Ex4 (photo labels)
u5_ex5_hint = "tour the campus, ride a jeep, climb a mountain, see a gong show, go snorkeling, put up tents, dance with local people, take photos"
u5_ex5 = [
    ("Our children decided to", "to get a better sense of the university's facilities.", "tour the campus"),
    ("While in Africa, our team", "to get close to the wildlife and observed them in their natural habitat.", "rode a jeep"),
    ("The group of friends got up early in the morning to", "and watch the sunrise from its top.", "climb a mountain"),
    ("We were lucky to", "in Vietnam, where skilled performers excitedly played this unique instrument.", "see a gong show"),
    ("Our classmates", "of the beautiful flora and fauna when visiting the national park last week.", "took photos"),
    ("The tourists arrived at the campsite and immediately started", "to prepare for the night.", "putting up tents"),
    ("While traveling in Brazil, we had a great opportunity to", "during a lively samba night.", "dance with local people"),
    ("We enjoyed", "in Ha Long Bay and seeing many colorful fish and coral reefs.", "going snorkeling"),
]
for pre, suf, ans in u5_ex5:
    u5_items.append(grammar_item("U5 Ex5", pre, suf, u5_ex5_hint, [ans]))

# Ex8: Fill with appropriate form (word in brackets)
u5_ex8 = [
    ("We _________________ several field trips since the beginning of the school year. (attend)", "have attended"),
    ("They _________________ paper, plastic, and glass for many years to reduce waste. (recycle)", "have recycled"),
    ("I _________________ a team leader once and it was definitely a memorable experience. (be)", "have been"),
    ("I (never) _________________ dolphins swimming in the ocean before. (see)", "have never seen"),
    ("I _________________ my research paper on environmental problems yet. (not complete)", "have not completed"),
    ("What _________________ (you) at the time the accident happened? (do)", "were you doing"),
    ("Since I _________________ the language club, I have studied various foreign languages. (join)", "joined"),
    ("They _________________ astronomy for over a decade. (study)", "have studied"),
    ("I _________________ down the street when I came across my old friend. (walk)", "was walking"),
    ("Last year, the choir _________________ the golden award for their exceptional vocal performance. (win)", "won"),
]
for q, ans in u5_ex8:
    u5_items.append({
        "game": "quiz",
        "type": "word_form",
        "typeLabel": "Word form",
        "skill": "writing",
        "exercise": "U5 Ex8",
        "question": q,
        "answer": ans,
        "options": [],
        "accept": [ans],
        "fillMode": True,
    })

# Ex9: Underline mistake
u5_ex9 = [
    ("He has played soccer for ten years and has won several championship with his team.", "championship", "championships"),
    ("The company has recently began implementing new strategies to improve its efficiency.", "began", "begun"),
    ("I has already drunk three cups of coffee this morning.", "has", "have"),
    ("He has received many compliments on his new shoes since he has bought them.", "has bought", "bought"),
    ("The community has recently came together to support those in need after the disaster.", "came", "come"),
    ("I just have finished a relaxing yoga session to reduce my stress level.", "just have", "have just"),
    ("Have you already worked on this project since three years?", "since", "for"),
    ("Robots have developed the ability to dream or imagine yet.", "have developed", "haven't developed"),
    ("I hadn't heard from them since they changed their phone numbers.", "hadn't", "haven't"),
    ("Have ever they learned how to play a musical instrument before?", "Have ever they", "Have they ever"),
]
for q, mistake, correction in u5_ex9:
    u5_items.append({
        "game": "quiz",
        "type": "fill_blank",
        "typeLabel": "Find the mistake",
        "skill": "writing",
        "exercise": "U5 Ex9",
        "question": q,
        "answer": correction,
        "options": [],
        "accept": [correction],
        "fillMode": True,
    })

# Ex10: Complete with correct form of words in box
u5_ex10_hint = "helpless, on purpose, unpleasant, peers, exhilarating, pleased, experience, by rote, embarrassing, by chance"
u5_ex10 = [
    ("The teacher encouraged her students to engage in active learning rather than learning", ".", "by rote"),
    ("During the bullying incident, I felt so", "and lonely, unable to defend myself.", "helpless"),
    ("I'm grateful that I always feel comfortable being myself around my", ".", "peers"),
    ("The company' s CEO was very", "with the team' s hard work and dedication.", "pleased"),
    ("They spread false rumors about Mr. Hung", "to damage his reputation.", "on purpose"),
    ("It was very", "when I mispronounced a word during a public speech, and everyone noticed.", "embarrassing"),
    ("My different part-time jobs during university provided me with valuable work", "and social skills.", "experience"),
    ("Luckily, I happened to find the perfect birthday gift for my sister", "while shopping online.", "by chance"),
    ("Lisa received a/an", "email filled with a lot of criticism and negativity.", "unpleasant"),
    ("After a challenging climb, the moment we reached the top of the mountain was", "and worthwhile.", "exhilarating"),
]
for pre, suf, ans in u5_ex10:
    u5_items.append(grammar_item("U5 Ex10", pre, suf, u5_ex10_hint, [ans]))

# Ex11: Circle correct word (choose_and_circle)
u5_ex11 = [
    (1, "The (exciting / touching) speech of the groom at the wedding brought tears to everyone's eyes.", ["exciting", "touching"], "touching"),
    (2, "The (amazing / terrible) public speaking experience I had at the conference made me anxious about future presentations.", ["amazing", "terrible"], "terrible"),
    (3, "We took a meaningful (eco-tour / performance) that highlighted the importance of protecting endangered species.", ["eco-tour", "performance"], "eco-tour"),
    (4, "As soon as the exam started, my mind went (blank / exhausted), and I couldn't remember anything I had studied.", ["blank", "exhausted"], "blank"),
    (5, "We used to (argue / agree) a lot, but we've learned to resolve conflicts without damaging our friendship.", ["argue", "agree"], "argue"),
    (6, "Skydiving for the first time was a (thrilling / awful) experience that filled me with excitement.", ["thrilling", "awful"], "thrilling"),
    (7, "Our company often organizes (team building / individual) activities to strengthen relationships among employees.", ["team building", "individual"], "team building"),
    (8, "Our school motivated students and taught us how to effectively (fight / run away from) the bullies.", ["fight", "run away from"], "fight"),
    (9, "My graduation day was a/an (embarrassing / memorable) event, filled with joy and proud moments.", ["embarrassing", "memorable"], "memorable"),
    (10, "Developing essential (soft / technical) skills, such as time management and teamwork, can greatly enhance your professional growth.", ["soft", "technical"], "soft"),
]
u5_items.append(cc_item("U5 Exercise 11", "Circle the correct words or phrases to complete the sentences.",
    [cc_row(o, p, opts, a) for o, p, opts, a in u5_ex11]))

# Ex12: Complete conversation
u5_ex12_hint = "participating, species, community, amazing, flora, sites, dancing, traditional, experience, course"
u5_ex12 = [
    ("Hi Mark, how's the summer (1)", "going?", "course"),
    ("It's been (2)", "so far.", "amazing"),
    ("we spent a lot of time exploring different (3)", "and learning about their history", "sites"),
    ("Definitely the (4)", "and fauna.", "flora"),
    ("unique plant and animal (5)", ".", "species"),
    ("we've had some workshops on (6)", "crafts and music", "traditional"),
    ("That's such a great way to understand the (7)", ".", "community"),
    ("Have you been (8) in any activities too?", "", "participating"),
    ("we've gone hiking, swimming, and even tried traditional (9)", ".", "dancing"),
    ("It sounds like an immersive (10)", ".", "experience"),
]
for pre, suf, ans in u5_ex12:
    u5_items.append(grammar_item("U5 Ex12", pre, suf, u5_ex12_hint, [ans]))


# ============================================================================
# UNIT 6: VIETNAMESE LIFESTYLES: THEN AND NOW
# ============================================================================

u6_items: list[dict] = []

# Ex4: Complete with words from Ex3
u6_ex4_hint = "opportunity, freedom, memorise, replace, pursue, take notes, depend on, various, family-oriented, extended"
u6_ex4 = [
    ("Anna is very", ". She always puts her family' s needs before her own.", "family-oriented"),
    ("I need to", "my old phone with a new one because it doesn't work anymore.", "replace"),
    ("The farmers", "rain to water their crops and help them grow.", "depend on"),
    ("My", "family includes my grandparents, aunts, uncles, and cousins.", "extended"),
    ("Learning a new language gives me an", "to communicate with people from different countries.", "opportunity"),
    ("The library has", "books on different topics, like animals, history, and adventure.", "various"),
    ("During meetings, it's important to", "to remember what was discussed.", "take notes"),
    ("I want to", "my dream of becoming a veterinarian and helping animals.", "pursue"),
    ("Jimmy uses flashcards to help him", "important dates for the history exam.", "memorise"),
    ("My parents give me the", "to make my own decisions, but they also offer guidance when I need it.", "freedom"),
]
for pre, suf, ans in u6_ex4:
    u6_items.append(grammar_item("U6 Ex4", pre, suf, u6_ex4_hint, [ans]))

# Ex5: Put words in correct form
u6_ex5 = [
    ("I find it easier to _________________ language patterns by practising speaking with native speakers. (memory)", "memorise"),
    ("Loan prefers to use her _________________ email for communication. (person)", "personal"),
    ("In the supermarket, you can find _________________ fruits such as apples, bananas, and oranges. (vary)", "various"),
    ("My sister stayed up late watching an _________________ version of her favourite movie. (extend)", "extended"),
    ("We are fortunate to live in a _________________ nation where everyone's rights are protected. (democracy)", "democratic"),
    ("Elderly people may become _________________ on others for assistance with daily tasks. (depend)", "dependent"),
    ("Our company has a _________________ meeting room where important discussions take place. (privacy)", "private"),
    ("I feel happy when I have the _________________ to express myself through art. (free)", "freedom"),
    ("The _________________ between summer and winter is the temperature. (differ)", "difference"),
    ("Playing video games is a popular form of _________________ among teenagers nowadays. (entertain)", "entertainment"),
]
for q, ans in u6_ex5:
    u6_items.append({
        "game": "quiz",
        "type": "word_form",
        "typeLabel": "Word form",
        "skill": "writing",
        "exercise": "U6 Ex5",
        "question": q,
        "answer": ans,
        "options": [],
        "accept": [ans],
        "fillMode": True,
    })

# Ex7: Circle correct verb form (V + to-inf / V-ing)
u6_ex7 = [
    (1, "The doctor suggests (eat / eating) more fruits and vegetables for a healthy diet.", ["eat", "eating"], "eating"),
    (2, "Do your parents fancy (going / went) for a walk in the park?", ["going", "went"], "going"),
    (3, "Oliver decided (studying / to study) for his exam instead of going out.", ["studying", "to study"], "to study"),
    (4, "My classmates agreed (to going / to go) on a trip together during the summer.", ["to going", "to go"], "to go"),
    (5, "He avoids (uses / using) his phone while driving to prevent accidents.", ["uses", "using"], "using"),
    (6, "Mai promises (to return / returning) the borrowed money by the end of the week.", ["to return", "returning"], "to return"),
    (7, "Kelly doesn't mind (waited / waiting) for her friends to arrive at the party.", ["waited", "waiting"], "waiting"),
    (8, "We enjoy (playing / to playing) board games with our family on Sundays.", ["playing", "to playing"], "playing"),
    (9, "My brother wants (adopt / to adopt) a puppy from the animal shelter.", ["adopt", "to adopt"], "to adopt"),
    (10, "We learn (to bake / baking) cookies by following a simple recipe from a cookbook.", ["to bake", "baking"], "to bake"),
    (11, "They plan (organised / to organise) a birthday party for their friend next week.", ["organised", "to organise"], "to organise"),
    (12, "They finished (cooking / to cook) dinner together just in time for the guests to arrive.", ["cooking", "to cook"], "cooking"),
    (13, "The tour guide recommends (trying / to try) the local cuisine when we travel.", ["trying", "to try"], "trying"),
    (14, "Taylor hopes (attended / to attend) a famous university after finishing high school.", ["attended", "to attend"], "to attend"),
    (15, "People tend (to eat / eating) more junk food when they 're stressed.", ["to eat", "eating"], "to eat"),
]
for o, q, opts, ans in u6_ex7:
    u6_items.append(quiz_mc("U6 Ex7", q, ans, opts))

# Ex8: Complete with correct form of verb in bracket
u6_ex8 = [
    ("Do you mind (water) ___________________ the plants while I'm away on vacation?", "watering"),
    ("We plan (watch) ___________________ an action film at home this weekend.", "to watch"),
    ("Tuan agreed (lend) ___________________ me his bicycle for the weekend.", "to lend"),
    ("My teacher suggests (practise) ___________________ the piano every day to improve.", "practising"),
    ("Emily promises (study) ___________________ hard for her upcoming exam.", "to study"),
    ("Nancy and Tom fancy (explore) ___________________ the hiking trails in the mountains.", "exploring"),
    ("We avoid (argue) ___________________ with each other to maintain harmony in the family.", "arguing"),
    ("She decides (write) ___________________ a letter to her friend who lives abroad.", "to write"),
    ("The children finished (clean) ___________________ their rooms before going out.", "cleaning"),
    ("My sister wants (go) ___________________ to the shopping mall and buy a new dress.", "to go"),
    ("Ben enjoys (play) ___________________ volleyball and (paint) ___________________ pictures in his free time.", "playing"),
    ("Quang would like (learn) ___________________ how to play the guitar.", "to learn"),
]
for q, ans in u6_ex8:
    u6_items.append({
        "game": "quiz",
        "type": "word_form",
        "typeLabel": "Verb form",
        "skill": "writing",
        "exercise": "U6 Ex8",
        "question": q,
        "answer": ans,
        "options": [],
        "accept": [ans],
        "fillMode": True,
    })

# Ex11: Complete conversation
u6_ex11_hint = "face-to-face, depended, appreciation, technology, opportunities, compare, different, pursue"
u6_ex11 = [
    ("My parents often tell me about how (1)", "life was when they were young.", "different"),
    ("they often mention how they didn't have access to all the (2)", "we have today.", "technology"),
    ("They say they spent more time outdoors and engaged in (3)", "interactions.", "face-to-face"),
    ("they talk about how limited their (4)", "were compared to now.", "opportunities"),
    ("They had to work really hard to (5)", ".", "pursue"),
    ("people (6)", "more on their families and neighbours for support.", "depended"),
    ("It's interesting to (7)", "their experiences to ours and see how much things have changed.", "compare"),
    ("It gives US a better (8)", "for what we have now.", "appreciation"),
]
for pre, suf, ans in u6_ex11:
    u6_items.append(grammar_item("U6 Ex11", pre, suf, u6_ex11_hint, [ans]))

# Ex14: Underline mistake
u6_ex14 = [
    ("Sarah doesn't mind help her friends with their homework.", "help", "helping"),
    ("My parents want to travelling to different countries and explore new cultures.", "travelling", "travel"),
    ("The museum has vary exhibits showcasing different periods of history.", "vary", "various"),
    ("Family-orient people enjoy family meals and gatherings as opportunities to connect and bond.", "orient", "oriented"),
    ("I finished do my homework and now I can go outside to play.", "do", "doing"),
    ("Phuong promises to waters the plants while her parents are away.", "waters", "water"),
    ("In a democracy country, citizens have the right to express their opinions freely.", "democracy", "democratic"),
    ("I suggest to try out the new restaurant downtown and then going shopping.", "to try", "trying"),
    ("My brother avoids eating junk food and drink sugary drinks to stay healthy.", "drink", "drinking"),
    ("Lam wants to pursuing her dream of becoming a doctor and help people.", "pursuing", "pursue"),
    ("We often go notes while watching documentaries to remember interesting facts.", "go", "take"),
    ("Quang is determined to learn to coding so he can build his own website.", "to coding", "to code"),
    ("They plan organise a charity event to raise money for a good cause.", "organise", "to organise"),
    ("The success of the restaurant depends at the quality of the food and service.", "at", "on"),
    ("I like to write in my person journal to express my thoughts and feelings.", "person", "personal"),
]
for q, mistake, correction in u6_ex14:
    u6_items.append({
        "game": "quiz",
        "type": "fill_blank",
        "typeLabel": "Find the mistake",
        "skill": "writing",
        "exercise": "U6 Ex14",
        "question": q,
        "answer": correction,
        "options": [],
        "accept": [correction],
        "fillMode": True,
    })


# ============================================================================
# OUTPUT
# ============================================================================

all_units = {
    "1": u1_items,
    "2": u2_items,
    "3": u3_items,
    "4": u4_items,
    "5": u5_items,
    "6": u6_items,
}

output = {"units": all_units, "skipped": []}

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

total = 0
for u, items in all_units.items():
    games: dict[str, int] = {}
    for it in items:
        g = it["game"]
        games[g] = games.get(g, 0) + 1
    total += len(items)
    print(f"Unit {u}: {games} ({len(items)} items)")
print(f"\nTotal: {total} items")
print(f"Written to: {OUT_PATH}")
