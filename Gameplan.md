Here is my plan for this app:

Here’s a refined and well-structured version of your thought dump, keeping it focused, clear, and action-driven:

AI-Powered Study Assistant (Expo React Native)

Why This Project?

Studying can be inefficient due to mental friction—deciding what to focus on, summarizing materials, and testing retention. After seeing how much AI boosts productivity in coding, I want to build a personal AI-powered study assistant that makes studying effortless by automating the hard parts: finding key information, generating quizzes, and allowing me to listen to my study guides instead of just reading them.

Key Features & Functionality

1. Course & Study Material Organization
	•	Add current courses for the term.
	•	Store and access related study materials (textbooks, guides, notes).

2. AI-Powered Study Guide (RAG System)
	•	Upload & Embed Study Materials
	•	Convert PDFs to text (Replicate PDF-to-Markdown).
	•	Store textbooks and study guides in a vector database (Pinecone/Supabase pgvector).
	•	AI dynamically retrieves the most relevant content instead of memorizing everything.
	•	Smart Question Generation
	•	AI generates quiz questions based on both study guides and textbooks.
	•	Helps surface what’s important without reading the entire book.

3. Interactive Study Mode
	•	Listen to Study Guides (TTS Integration)
	•	Text-to-speech (Whisper / ElevenLabs / Cocoro) reads study guides aloud.
	•	Play, pause, resume controls for an uninterrupted experience.
	•	Read-Along Mode
	•	As audio plays, text highlights words in sync (using Whisper timestamps).
	•	Allows for reinforced learning through both reading and listening.

4. Quiz & Retention Testing
	•	AI-generated random quiz questions based on retrieved study material.
	•	Adaptive difficulty – quizzes adjust based on weak areas.
	•	Continuous exposure to key concepts ensures long-term retention.

5. AI-Powered Study Chat
	•	Ask AI to explain difficult concepts in a simple, memorable way.
	•	AI generates three reinforcement questions to solidify understanding.
	•	Acts like a personal tutor for pennies, providing professor-level insights.

The Core Benefit

This app removes the decision fatigue of studying by:
✅ Finding relevant material automatically – No more skimming through books.
✅ Testing me on what actually matters – AI-generated quizzes.
✅ Letting me absorb content in multiple ways – Read, listen, or both.
✅ Making studying feel engaging & efficient – AI-powered interactivity.

Tech Stack
	•	React Native (Expo) – Study anywhere, anytime.
	•	Vector Database (Pinecone / Supabase pgvector) – Store & retrieve study materials.
	•	OpenAI Embeddings API – Converts text into searchable vectors.
	•	Whisper / ElevenLabs / Cocoro – Text-to-speech & timestamped syncing.
	•	LangChain / LlamaIndex – Handles the Retrieval-Augmented Generation (RAG) system.

Design Philosophy

🎨 Minimalist & Dopamine-Satisfying UI
	•	Simple four-color scheme: Pearl White, Dark Gray, Green, Yellow.
	•	Markdown-styled text for easy readability.
	•	Visually appealing highlighted words in sync with audio.

Next Steps (MVP Development Plan)

Phase 1 (Today’s Focus - Quick MVP)

✅ Convert study guides into text using Replicate PDF-to-Markdown.
✅ Build a basic AI quiz feature that tests me on study guide content.
✅ Implement text-to-speech (TTS) to listen to study materials.

Phase 2 (Enhancements & RAG Integration)
	•	Add vector search for smart retrieval of study material.
	•	Implement AI chat tutor for explanations & reinforcement questions.
	•	Sync Whisper timestamps for read-along mode.

Phase 3 (Polish & Expansion)
	•	Test embedding entire textbooks into the system.
	•	Improve adaptive quiz difficulty for better learning curves.
	•	Optimize UI/UX for seamless studying experience.

Final Thoughts

This app is meant to be fast, intuitive, and frictionless—a tool that eliminates excuses for not studying by making it:
✅ Effortless to find information
✅ Engaging to study
✅ Customizable to my learning style

With study chat, quizzes, read-along, and listening mode, I can study smarter, not harder. 🚀

This version keeps everything clear, structured, and action-driven, so you can build it step by step without distractions. What do you think? Need any refinements?

What I want you to do now is,

Wipe the current pages that are here and I just want you to make me like a solid very clean very simple UI.

The goal is UI is on the first page that I get to. I want to be able to select the class and I want to be able to add a class.

When I select the class, I want to go to another route with that class and on this page, I want to have my study guides.

When I click the study guides, I want a screen to show up that has all of the text on the study guide a decently big size text and I want it in markdown

I want you to add data to all of this. I will actually put the data in.

I want you to make a component that is like a player that kind of floats and sticks to the bottom of this study guide page with the mark down on it right you can put a play button in the middle maybe like some basic stuff like that

I want to use pearl white dark gray, a nice pastel green and a nice pastel orange for your colors.

Start there and then I'll see what you come up with. I'm trying to make the colors and stuff really attract my my dopamine to really improve my studying.