-- ============================================
-- Importar replays do Club
-- URLs EXATAS do CSV - sem modificação
-- ============================================

INSERT INTO club_sessions (title, scheduled_at, max_slots, status)
VALUES ('Aulas Gravadas', NOW(), 999, 'completed');

INSERT INTO club_replays (session_id, title, video_url, views)
SELECT
  (SELECT id FROM club_sessions WHERE title = 'Aulas Gravadas' LIMIT 1),
  title,
  video_url,
  0
FROM (
  VALUES
    ('Análise de sites - 19/02/25', 'https://f005.backblazeb2.com/file/seoflix/1769989950352_Análise_de_sites_-_190225_-.mp4'),
    ('Análise de sites - 26/02/25', 'https://f005.backblazeb2.com/file/seoflix/1769989739819_Análise_de_sites_-_260225_-.mp4'),
    ('Análise de sites - 12/03/25', 'https://f005.backblazeb2.com/file/seoflix/1769990137200_Análise_de_sites_-_120325_-.mp4'),
    ('Análise de sites - 20/03/25', 'https://f005.backblazeb2.com/file/seoflix/1769990425750_Análise_de_sites_-_200325_-.mp4'),
    ('Análise de sites - 26/03/25', 'https://f005.backblazeb2.com/file/seoflix/1769990630281_Análise_de_sites_-_260325_-.mp4'),
    ('Análise de sites - 02/04/25', 'https://f005.backblazeb2.com/file/seoflix/1769990764789_Análise_de_sites_-_020425_-.mp4'),
    ('Análise de sites - 09/04/25', 'https://f005.backblazeb2.com/file/seoflix/1769990906828_Análise_de_sites_-_090425_-.mp4'),
    ('Análise de sites - 16/04/25', 'https://f005.backblazeb2.com/file/seoflix/1769992058946_Análise_de_sites_-_160425_-.mp4'),
    ('Análise de sites - 30/04/25', 'https://f005.backblazeb2.com/file/seoflix/1769992214835_Análise_de_sites_-_300425_-.mp4'),
    ('Análise de sites - 07/05/25', 'https://f005.backblazeb2.com/file/seoflix/1769992371504_Análise_de_sites_-_070525_-.mp4'),
    ('Análise de sites - 14/05/25', 'https://f005.backblazeb2.com/file/seoflix/1769992447010_Análise_de_sites_-_140525_-.mp4'),
    ('Análise de sites - 21/05/25', 'https://f005.backblazeb2.com/file/seoflix/1769992558195_Análise_de_sites_-_210525_-.mp4'),
    ('Análise de sites - 04/06/25', 'https://f005.backblazeb2.com/file/seoflix/1769992688410_Análise_de_sites_-_040625_-.mp4'),
    ('Análise de sites - 18/06/25', 'https://f005.backblazeb2.com/file/seoflix/1769992775180_Análise_de_sites_-_180625_-.mp4'),
    ('Análise de sites - 25/06/25', 'https://f005.backblazeb2.com/file/seoflix/1769992835038_Análise_de_sites_-_250625_-.mp4'),
    ('Análise de sites - 02/07/25', 'https://f005.backblazeb2.com/file/seoflix/1769992905394_Análise_de_sites_-_020725_-.mp4'),
    ('Análise de sites - 16/07/25', 'https://f005.backblazeb2.com/file/seoflix/1769993139692_Análise_de_sites_-_160725_-.mp4'),
    ('Análise de sites - 30/07/25', 'https://f005.backblazeb2.com/file/seoflix/1769993332699_8links_club_30.07.25.mp4'),
    ('"Análise de sites - 06/08/25 "', 'https://f005.backblazeb2.com/file/seoflix/1769993393490_Análise_de_sites_-_060825_-.mp4'),
    ('Análise de sites - 08/10/25', 'https://f005.backblazeb2.com/file/seoflix/1769993447224_8links_club_8.10.25.mp4'),
    ('Análise de sites - 15/10/25', 'https://f005.backblazeb2.com/file/seoflix/1769993494909_8links_15.10.25.mp4'),
    ('Análise de sites - 22/10/25', 'https://f005.backblazeb2.com/file/seoflix/1769993532738_8links_club_22.10.25.mp4'),
    ('Análise de sites - 29/10/25', 'https://f005.backblazeb2.com/file/seoflix/1770814114041_Análise_de_sites_-_29:10:25.mp4'),
    ('Análise de sites - 05/11/25', 'https://f005.backblazeb2.com/file/seoflix/1770814146820_Análise_de_sites_-_05:11:25.mp4'),
    ('Análise de sites - 12/11/25', 'https://f005.backblazeb2.com/file/seoflix/1770814218836_Análise_de_sites_-_12:11:25.mp4'),
    ('Análise de sites - 19/11/25', 'https://f005.backblazeb2.com/file/seoflix/1770814267639_Análise_de_sites_-_19:11:25.mp4'),
    ('Análise de sites - 26/11/25', 'https://f005.backblazeb2.com/file/seoflix/1770814420664_Análise_de_sites_-_26:11:25.mp4'),
    ('Análise de sites - 03/12/25', 'https://f005.backblazeb2.com/file/seoflix/1770814458078_Análise_de_sites_-_03:12:25.mp4'),
    ('Análise de sites - 21/01/26', 'https://f005.backblazeb2.com/file/seoflix/1770814482780_club_21.01.26.mp4'),
    ('Análise de sites - 28/01/26', 'https://f005.backblazeb2.com/file/seoflix/1770814817172_Análise_de_sites_-_28:01:26.mp4'),
    ('Análise de sites - 04/02/26', 'https://f005.backblazeb2.com/file/seoflix/1770814646266_club_04.02.26.mp4'),
    ('Análise de sites - 11/02/26', 'https://f005.backblazeb2.com/file/seoflix/1772725684710_Análise_de_sites_-_15:02:26.mp4'),
    ('Análise de sites - 25/02/26', 'https://f005.backblazeb2.com/file/seoflix/1772725848691_Análise_de_sites_-_25:02:26.mp4'),
    ('Análise de sites - 04/03/26', 'https://f005.backblazeb2.com/file/seoflix/1772725901671_Análise_de_sites_-_04:03:26.mp4')
) AS v(title, video_url);
