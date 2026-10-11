CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS espais (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    capacitat INT NOT NULL CHECK (capacitat > 0),
    factor_co2_kwh NUMERIC(5,3) NOT NULL DEFAULT 0.259,
    tarifa_hora NUMERIC(8,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS reserves (
    id SERIAL PRIMARY KEY,
    espai_id INT NOT NULL REFERENCES espais(id) ON DELETE CASCADE,
    usuari_email VARCHAR(150) NOT NULL,
    data_inici TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fi TIMESTAMP WITH TIME ZONE NOT NULL,
    asistent_estimats INT NOT NULL,
    co2_estalviat_kg NUMERIC(8,2) NOT NULL,
    creat_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    EXCLUDE USING gist (
        espai_id WITH =,
        tstzrange(data_inici, data_fi, '[)') WITH &&
    )
);

INSERT INTO espais (nom, capacitat, factor_co2_kwh, tarifa_hora) VALUES
('Auditori Glòries Sostenible', 150, 0.210, 85.00),
('Sala EcoEspai Barcelona', 40, 0.180, 45.00),
('Fòrum Clima i Innovació', 300, 0.250, 150.00)
ON CONFLICT DO NOTHING;