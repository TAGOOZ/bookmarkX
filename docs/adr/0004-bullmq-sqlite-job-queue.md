# BullMQ + SQLite for Job Queue

Background job processing via BullMQ backed by SQLite (no Redis dependency). Sufficient for personal use (100s of jobs/day). Handles fetch scheduling, AI classification, and summarization jobs with retry and concurrency. Chosen over Redis (overkill for personal tool) and simple cron (lacks retry/concurrency).
