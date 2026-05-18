-- ============================================
-- Importar replays do Club
-- Títulos: Análise 01, Análise 02, etc.
-- Datas extraídas do título original
-- URLs EXATAS do arquivo original - sem modificação
-- ============================================

INSERT INTO club_sessions (title, scheduled_at, max_slots, status)
VALUES ('Aulas Gravadas', NOW(), 999, 'completed');

INSERT INTO club_replays (session_id, title, video_url, views, created_at)
SELECT
  (SELECT id FROM club_sessions WHERE title = 'Aulas Gravadas' LIMIT 1),
  title,
  video_url,
  0,
  created_at
FROM (
  VALUES
    ('Análise 02', 'https://f005.backblazeb2.com/file/seoflix/1769989739819_Análise_de_sites_-_260225_-.mp4', '2025-02-19 00:00:00+00'::timestamptz),
    ('Análise 03', 'https://f005.backblazeb2.com/file/seoflix/1769990137200_Análise_de_sites_-_120325_-.mp4', '2025-02-26 00:00:00+00'::timestamptz),
    ('Análise 04', 'https://f005.backblazeb2.com/file/seoflix/1769990425750_Análise_de_sites_-_200325_-.mp4', '2025-03-12 00:00:00+00'::timestamptz),
    ('Análise 05', 'https://f005.backblazeb2.com/file/seoflix/1769990630281_Análise_de_sites_-_260325_-.mp4', '2025-03-20 00:00:00+00'::timestamptz),
    ('Análise 06', 'https://f005.backblazeb2.com/file/seoflix/1769990764789_Análise_de_sites_-_020425_-.mp4', '2025-03-26 00:00:00+00'::timestamptz),
    ('Análise 07', 'https://f005.backblazeb2.com/file/seoflix/1769990906828_Análise_de_sites_-_090425_-.mp4', '2025-04-02 00:00:00+00'::timestamptz),
    ('Análise 08', 'https://f005.backblazeb2.com/file/seoflix/1769992058946_Análise_de_sites_-_160425_-.mp4', '2025-04-09 00:00:00+00'::timestamptz),
    ('Análise 09', 'https://f005.backblazeb2.com/file/seoflix/1769992214835_Análise_de_sites_-_300425_-.mp4', '2025-04-16 00:00:00+00'::timestamptz),
    ('Análise 10', 'https://f005.backblazeb2.com/file/seoflix/1769992371504_Análise_de_sites_-_070525_-.mp4', '2025-04-30 00:00:00+00'::timestamptz),
    ('Análise 11', 'https://f005.backblazeb2.com/file/seoflix/1769992447010_Análise_de_sites_-_140525_-.mp4', '2025-05-07 00:00:00+00'::timestamptz),
    ('Análise 12', 'https://f005.backblazeb2.com/file/seoflix/1769992558195_Análise_de_sites_-_210525_-.mp4', '2025-05-14 00:00:00+00'::timestamptz),
    ('Análise 13', 'https://f005.backblazeb2.com/file/seoflix/1769992688410_Análise_de_sites_-_040625_-.mp4', '2025-05-21 00:00:00+00'::timestamptz),
    ('Análise 14', 'https://f005.backblazeb2.com/file/seoflix/1769992775180_Análise_de_sites_-_180625_-.mp4', '2025-06-04 00:00:00+00'::timestamptz),
    ('Análise 15', 'https://f005.backblazeb2.com/file/seoflix/1769992835038_Análise_de_sites_-_250625_-.mp4', '2025-06-18 00:00:00+00'::timestamptz),
    ('Análise 16', 'https://f005.backblazeb2.com/file/seoflix/1769992905394_Análise_de_sites_-_020725_-.mp4', '2025-06-25 00:00:00+00'::timestamptz),
    ('Análise 17', 'https://f005.backblazeb2.com/file/seoflix/1769993139692_Análise_de_sites_-_160725_-.mp4', '2025-07-02 00:00:00+00'::timestamptz),
    ('Análise 18', 'https://f005.backblazeb2.com/file/seoflix/1769993332699_8links_club_30.07.25.mp4', '2025-07-16 00:00:00+00'::timestamptz),
    ('Análise 19', 'https://f005.backblazeb2.com/file/seoflix/1769993393490_Análise_de_sites_-_060825_-.mp4', '2025-07-30 00:00:00+00'::timestamptz),
    ('Análise 20', 'https://f005.backblazeb2.com/file/seoflix/1769993447224_8links_club_8.10.25.mp4', '2025-08-06 00:00:00+00'::timestamptz),
    ('Análise 21', 'https://f005.backblazeb2.com/file/seoflix/1769993494909_8links_15.10.25.mp4', '2025-10-08 00:00:00+00'::timestamptz),
    ('Análise 22', 'https://f005.backblazeb2.com/file/seoflix/1769993532738_8links_club_22.10.25.mp4', '2025-10-15 00:00:00+00'::timestamptz),
    ('Análise 23', 'https://f005.backblazeb2.com/file/seoflix/1770814114041_Análise_de_sites_-_29:10:25.mp4', '2025-10-22 00:00:00+00'::timestamptz),
    ('Análise 24', 'https://f005.backblazeb2.com/file/seoflix/1770814146820_Análise_de_sites_-_05:11:25.mp4', '2025-10-29 00:00:00+00'::timestamptz),
    ('Análise 25', 'https://f005.backblazeb2.com/file/seoflix/1770814218836_Análise_de_sites_-_12:11:25.mp4', '2025-11-05 00:00:00+00'::timestamptz),
    ('Análise 26', 'https://f005.backblazeb2.com/file/seoflix/1770814267639_Análise_de_sites_-_19:11:25.mp4', '2025-11-12 00:00:00+00'::timestamptz),
    ('Análise 27', 'https://f005.backblazeb2.com/file/seoflix/1770814420664_Análise_de_sites_-_26:11:25.mp4', '2025-11-19 00:00:00+00'::timestamptz),
    ('Análise 28', 'https://f005.backblazeb2.com/file/seoflix/1770814458078_Análise_de_sites_-_03:12:25.mp4', '2025-11-26 00:00:00+00'::timestamptz),
    ('Análise 29', 'https://f005.backblazeb2.com/file/seoflix/1770814482780_club_21.01.26.mp4', '2025-12-03 00:00:00+00'::timestamptz),
    ('Análise 30', 'https://f005.backblazeb2.com/file/seoflix/1770814817172_Análise_de_sites_-_28:01:26.mp4', '2026-01-21 00:00:00+00'::timestamptz),
    ('Análise 31', 'https://f005.backblazeb2.com/file/seoflix/1770814646266_club_04.02.26.mp4', '2026-01-28 00:00:00+00'::timestamptz),
    ('Análise 32', 'https://f005.backblazeb2.com/file/seoflix/1772725684710_Análise_de_sites_-_15:02:26.mp4', '2026-02-04 00:00:00+00'::timestamptz),
    ('Análise 33', 'https://f005.backblazeb2.com/file/seoflix/1772725848691_Análise_de_sites_-_25:02:26.mp4', '2026-02-11 00:00:00+00'::timestamptz),
    ('Análise 34', 'https://f005.backblazeb2.com/file/seoflix/1772725901671_Análise_de_sites_-_04:03:26.mp4', '2026-02-25 00:00:00+00'::timestamptz)
) AS v(title, video_url, created_at);