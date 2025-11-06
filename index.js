require('dotenv').config();
const { Telegraf, Markup } = require("telegraf");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const PASS_THRESHOLD = 8;

const QUESTIONS = [
    { text: "*Question 1:*\n14 boys are participating in a summer camp\\.\n\n*Details:*\n\\- 4 of them went with their 3 brothers each\n\\- 6 of them went with their 2 brothers each\n\\- 2 of them went with their 1 brother each\n\\- 2 of them have no brothers in the camp\n\n*How many families do the boys come from\\?*", options: ["14", "6", "4", "8"], correct: 1 },
    
    { text: "*Question 2:*\nOn the blackboard, 50 consecutive natural numbers are written, and it took exactly 110 digits to write them\\.\n\n*Which of the following sets of numbers could be written on the blackboard\\?*", options: ["50 - 100", "55 – 102", "55 - 101", "60–109"], correct: 3 },
    
    { text: "*Question 3:*\nVahagn, while traveling, reached a magical bridge\\. The wizard who built the bridge said:\n\"Each time you cross the bridge, the number of coins you have will double, but after crossing, you must pay me 40 coins\\.\"\nVahagn decides to cross the bridge repeatedly to increase his coins, but after crossing 3 times, he has no coins left\\.\n\n*Question\\:* How many coins did Vahagn have before crossing the bridge\\?", options: ["20 coins", "30 coins", "35 coins", "40 coins"], correct: 2 },
    
    { text: "*Question 4:*\nThe mailman checks the mailbox at regular intervals and takes any letters if they are there\\. He checked the mailbox for the first time at 7\\:00 AM and the last time at 7\\:00 PM\\.\nIt is known that the intervals between checks are equal\\.\n\n*Question\\:* Find the duration of each interval if the mailman checked the mailbox 5 times during the day\\.", options: ["2 hours", "3 hours", "4 hours", "5 hours"], correct: 1 },
    
    { text: "*Question 5:*\nIn a lake, the number of flowers doubles every day\\.\nIf we place 1 flower in the lake initially, then after 16 days the lake will be completely covered with flowers\\.\n\n*How many days will it take for the lake to be completely covered if we start with 4 flowers instead\\?*", options: ["12 days", "13 days", "14 days", "15 days"], correct: 2 },
    
    { text: "*Question 6:*\nOn the island of Kusi, there live truth\\-tellers and liars\\. Truth\\-tellers always tell the truth, and liars always lie\\.\nTwo inhabitants are talking:\n\"One of us is a truth\\-teller\\.\"\n\"You are a liar\\.\"\nLater, a group of people were talking, and each said: \"Two of you are truth\\-tellers\\.\"\n\n*Question\\:*\n1\\. Who is the truth\\-teller among the two inhabitants\\?\n2\\. How many truth\\-tellers can be in the group\\?", options: ["First person; 3 truth-tellers", "First person; 2 truth-tellers", "Second person; 4 truth-tellers", "Both are truth-tellers; 3 truth-tellers"], correct: 0 },
    
    { text: "*Question 7:*\nIn a bus, the seats are single seats and double seats\\.\nIn the morning, the driver noticed that 13 passengers were seated so that 9 seats were completely empty\\.\nIn the evening, he noticed that only 6 seats were completely empty, although there were 10 passengers\\.\n\n*Question\\:* How many seats are there in the bus\\?", options: ["16", "17", "18", "19"], correct: 0 },
    
    { text: "*Question 8:*\nWhen threatened, a chameleon changes its color as follows\\:\nRed \\→ Blue\nBlue \\→ Orange\nOrange \\→ Red\nDuring a hunt, a red chameleon encountered danger 50 times\\.\n\n*Determine the color of the chameleon when it returned home\\.*", options: ["red", "blue", "orange", "Քամելիոնը ինչ ա՞"], correct: 2 },
    
    { text: "*Question 9:*\nHow many times do you need to write the number 10101 consecutively so that the resulting number is divisible by 9\\?", options: ["2 times", "3 times", "4 times", "5 times"], correct: 1 },
    
    { text: "*Question 10:*\nHow many two\\-digit numbers are there whose digits add up to 15\\?", options: ["10 times", "8 times", "6 times", "4 times"], correct: 3 },
];

const sessions = new Map();
const completedUsers = new Set(); // Track users who have finished

function logEvent(level, event, data = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        level,
        event,
        ...data
    };

    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${event}`;
    const details = Object.entries(data)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');

    if (level === 'error') {
        console.error(`${logMessage} | ${details}`);
    } else {
        console.log(`${logMessage} | ${details}`);
    }
}

function getUserInfo(ctx) {
    return {
        userId: ctx.from.id,
        username: ctx.from.username || 'N/A',
        firstName: ctx.from.first_name || '',
        lastName: ctx.from.last_name || ''
    };
}

function startNewSession(userId) {
    sessions.set(userId, { i: 0, score: 0, answered: false, locked: false });
    logEvent('info', 'SESSION_STARTED', {
        userId,
        activeSessions: sessions.size,
        totalCompleted: completedUsers.size
    });
}

function getSession(userId) {
    return sessions.get(userId);
}

function endSession(userId) {
    sessions.delete(userId);
    logEvent('info', 'SESSION_ENDED', {
        userId,
        activeSessions: sessions.size - 1
    });
}

function markUserCompleted(userId) {
    completedUsers.add(userId);
    logEvent('info', 'USER_COMPLETED', {
        userId,
        totalCompleted: completedUsers.size
    });
}

function hasUserCompleted(userId) {
    return completedUsers.has(userId);
}

function questionKeyboard(qIndex) {
    const q = QUESTIONS[qIndex];
    const buttons = q.options.map((opt, idx) => 
        Markup.button.callback(
            `${String.fromCharCode(65 + idx)}. ${opt}`,  // Plain text - NO escaping!
            `ans:${qIndex}:${idx}`
        )
    );
    return Markup.inlineKeyboard(buttons.map(b => [b]));
}


async function sendQuestion(ctx, qIndex) {
    const q = QUESTIONS[qIndex];
    try {
        await ctx.reply(
            q.text,
            { parse_mode: "MarkdownV2", ...questionKeyboard(qIndex), disable_web_page_preview: true }
        );
    } catch (err) {
        logEvent('error', 'QUESTION_SEND_FAILED', {
            ...getUserInfo(ctx),
            questionIndex: qIndex + 1,
            error: err.message
        });
        throw err; // Re-throw to be caught by handler
    }
}

bot.start(async (ctx) => {
    const userInfo = getUserInfo(ctx);
    try {
        await ctx.reply(
            `Welcome! You'll get 10 questions. Pass at 8/10.\n\nPress Start when ready.`,
            Markup.inlineKeyboard([Markup.button.callback("Start quiz ▶️", "start_quiz")])
        );
        logEvent('info', 'BOT_START', userInfo);
    } catch (err) {
        logEvent('error', 'START_MESSAGE_FAILED', {
            ...userInfo,
            error: err.message
        });
    }
});



bot.action("start_quiz", async (ctx) => {
    const userId = ctx.from.id;
    const userInfo = getUserInfo(ctx);
    try {
        await ctx.answerCbQuery();

        if (hasUserCompleted(userId)) {
            logEvent('warn', 'RETAKE_ATTEMPT_BLOCKED', userInfo);
            return ctx.reply("You have already completed the quiz.");
        }

        if (sessions.has(userId)) {
            logEvent('warn', 'DUPLICATE_SESSION_ATTEMPT', userInfo);
            return ctx.reply("You already have an active session. Please finish it.");
        }
        startNewSession(userId);
        await ctx.reply("Good luck! ✅");
        await sendQuestion(ctx, 0);
    } catch (err) {
        logEvent('error', 'QUIZ_START_FAILED', {
            ...userInfo,
            error: err.message,
            stack: err.stack
        });
        // Clean up session if it was created
        if (sessions.has(ctx.from.id)) {
            endSession(ctx.from.id);
        }
        try {
            await ctx.reply("Failed to start quiz. Please try again with /start");
        } catch (e) {
            // Silent fail
        }
    }
});


bot.on("callback_query", async (ctx, next) => {
    try {
        const data = ctx.callbackQuery.data || "";
        if (!data.startsWith("ans:")) return next();

        const userId = ctx.from.id;
        const session = getSession(userId);
        const userInfo = getUserInfo(ctx);
        if (!session) {
            await ctx.answerCbQuery({ text: "No active quiz. Use /start to start.", show_alert: true });
            return;
        }

        if (session.locked) {
            logEvent('debug', 'ANSWER_WHILE_LOCKED', userInfo);
            await ctx.answerCbQuery({ text: "Please wait…", show_alert: false });
            return;
        }

        const [, qIndexStr, choiceStr] = data.split(":");
        const qIndex = parseInt(qIndexStr, 10);
        const choice = parseInt(choiceStr, 10);

        if (qIndex !== session.i) {
            await ctx.answerCbQuery({ text: "Already answered or not current question.", show_alert: false });
            return;
        }

        session.locked = true;

        const correct = QUESTIONS[qIndex].correct === choice;
        if (correct) session.score += 1;

        await ctx.answerCbQuery({ text: correct ? "✅ Correct" : "❌ Incorrect" });

        // Remove the keyboard from the answered question
        try {
            const q = QUESTIONS[qIndex];
            const answerEmoji = correct ? "✅" : "❌";
            const userAnswer = String.fromCharCode(65 + choice);
            await ctx.editMessageText(
                `Q${qIndex + 1}/10\n\n${q.text}\n\n${answerEmoji} Your answer: ${userAnswer}`,
                { parse_mode: "MarkdownV2" }  // Add this!
            );
        } catch (editErr) {
            // Message might be too old to edit or deleted
            console.error(`Failed to edit message for question ${qIndex}:`, editErr);
        }

        session.i += 1;
        session.locked = false;

        if (session.i >= QUESTIONS.length) {
            const score = session.score;
            const passed = score >= PASS_THRESHOLD;
            const now = new Date();
            const userTag = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.first_name || "Intern"} ${ctx.from.last_name || ""}`.trim();

            markUserCompleted(userId);
            endSession(userId);

            if (passed) {
                await ctx.reply(
                    `🎉 Congratulations, you won a prize!\n\nWinner: ${userTag}\nScore: ${score}/10\nTime: ${now.toLocaleString()}`,
                    { protect_content: true }
                );
                await ctx.reply("Please show this message to the staff to claim your prize.", { protect_content: true });
            } else {
                await ctx.reply(`Thanks for participating! Your score: ${score}/10.`);
            }
        } else {
            await sendQuestion(ctx, session.i);
        }
    } catch (err) {
        console.error(`Error handling answer from user ${ctx.from.id}:`, err);
        // Unlock and clean up session
        const session = getSession(ctx.from.id);
        if (session) {
            session.locked = false;
            // Optionally end session on critical error
            // endSession(ctx.from.id);
        }
        try {
            await ctx.reply("An error occurred. Please restart with /start");
        } catch (e) {
            // Silent fail
        }
    }
});

// Fallback help
bot.help((ctx) => {
    try {
        ctx.reply("Commands:\n/start – intro\n/start_quiz – start the quiz");
    } catch (err) {
        console.error(`Failed to send help message:`, err);
    }
});

// Start long polling (local machine)
bot.launch()
    .then(() => {
        console.log("Quiz bot is running with long polling. Press Ctrl+C to stop.");
    })
    .catch((err) => {
        console.error("Failed to launch bot:", err);
        process.exit(1);
    });

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.catch((err, ctx) => {
    console.error(`Error for user ${ctx.from?.id}:`, err);
    try {
        ctx.reply("An error occurred. Please try again with /start").catch(() => {});
    } catch (e) {
        // Silent fail if we can't even send error message
    }
});

setInterval(() => {
    logEvent('info', 'STATISTICS', {
        activeSessions: sessions.size,
        totalCompleted: completedUsers.size,
        totalParticipants: sessions.size + completedUsers.size,
        memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    });
}, 5 * 60 * 1000);

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
