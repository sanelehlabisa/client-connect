-- Keep application identities aligned with the Keycloak development realm.

UPDATE users
SET
    name = 'Wilson Masuku',
    email = 'lozaicmasuku@gmail.com'
WHERE id = 'adviser-1';

UPDATE users
SET
    name = 'Sanele Hlabisa',
    email = 'hlabisasanele730@gmail.com'
WHERE id = 'client-1';

UPDATE marketplace_providers
SET name = 'Royal Square Financial - Wilson Masuku'
WHERE id = 'provider-adviser-royal-square';
