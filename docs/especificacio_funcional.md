1. Llista d'Històries d'Usuari (User Stories)
US01 · Consulta de disponibilitat: Com a usuari/client, vull veure un calendari interactiu de l'espai per a saber quines hores estan lliures sense haver de telefonar.

US02 · Reserva d'espais: Com a usuari registrat, vull seleccionar un dia, horari i serveis extres per a sol·licitar una reserva de manera immediata.

US03 · Control de concurrència: Com a sistema, vull bloquejar les reserves simultànies sobre la mateixa sala i rang horari per a evitar l'overbooking.

US04 · Càlcul de petjada de CO₂: Com a organitzador d'un esdeveniment, vull veure una estimació de l'impacte ambiental (CO₂/residus) abans de confirmar la reserva.

US05 · Gestió de reserves (Admin): Com a administrador de l'espai, vull acceptar, canviar o cancel·lar reserves des d'un panell de control centralitzat.

2. Stack Tecnològic Triat i Justificat
Frontend: HTML5, CSS3 (Tailwind CSS / Bootstrap) i JavaScript ES6+.

Justificació: Garanteix leugeresa i flexibilitat per a realitzar peticions asíncrones amb fetch() sense recarregar la pàgina.

Backend: Node.js amb Express (o PHP amb Laravel).

Justificació: Permet crear una API REST eficient per a gestionar operacions I/O asíncrones i el control estrictament concurrent de dades.

Base de Dades: PostgreSQL o MySQL.

Justificació: Sistema relacional robust, indispensable per a garantir la integritat referencial i transaccions atòmiques en el procés de reserva.

Gestió del Codi: Git + GitHub.
