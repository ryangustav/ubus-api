-- Índices de performance (Guilhotina e buscas)
CREATE INDEX IF NOT EXISTS idx_reservas_viagem ON reservas(id_viagem);
CREATE INDEX IF NOT EXISTS idx_reservas_caronistas ON reservas(id_viagem) WHERE is_carona = TRUE;
CREATE INDEX IF NOT EXISTS idx_viagens_abertas ON viagens(status, abertura_votacao, fechamento_votacao);
