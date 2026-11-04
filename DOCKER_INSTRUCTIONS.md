# Instruções para Execução com Docker (Localhost:3000)

O sistema IFTA de Gestão Técnica de Ativos e Manutenção agora conta com suporte nativo a contêineres Docker, permitindo testar e rodar o projeto localmente com apenas um comando.

---

## 1. Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução no seu computador (Windows, macOS ou Linux).

---

## 2. Como Rodar com Docker Compose (Método Mais Fácil)

Na pasta raiz do projeto, execute no terminal:

```bash
docker compose up --build
```

O Docker irá:
1. Baixar a imagem base do Node 20 Alpine.
2. Instalar as dependências e compilar a aplicação com otimização de produção.
3. Iniciar o servidor HTTP na porta **3000**.

Quando finalizar, abra o seu navegador e acesse:
👉 **[http://localhost:3000](http://localhost:3000)**

Para rodar em segundo plano (modo daemon):
```bash
docker compose up -d
```

Para parar o contêiner:
```bash
docker compose down
```

---

## 3. Como Rodar com Comandos Docker Nativos

Se preferir utilizar a CLI do Docker diretamente sem o Compose:

```bash
# 1. Construir a imagem Docker
docker build -t ifta-sistema-manutencao .

# 2. Iniciar o contêiner com volume persistente para manter máquinas e peças permanentemente salvas
docker run -d -p 3000:3000 -v ifta_persistent_data:/app/data --name ifta-app ifta-sistema-manutencao
```

Acesse:
👉 **[http://localhost:3000](http://localhost:3000)**

Para parar e remover o contêiner (os dados no volume `ifta_persistent_data` são preservados):
```bash
docker stop ifta-app && docker rm ifta-app
```

---

## 4. Persistência Permanente de Dados no Docker

### Onde e como os dados são salvos?
- O sistema grava todas as **máquinas**, **peças**, **especificações técnicas**, **manuais**, **históricos** e **vínculos** no arquivo físico:
  📁 `/app/data/ifta_database.json`
- Este diretório está mapeado para o volume persistente do Docker:
  💾 `ifta_persistent_data:/app/data`

### Garantias de Armazenamento:
1. **Permanente até Exclusão**: Todo cadastro ou edição de máquinas e peças é salvo imediatamente no disco. Nada é apagado ao fechar abas, limpar o navegador ou reiniciar o contêiner Docker.
2. **Exclusão Real**: Ao clicar no botão **"Excluir Máquina"** ou **"Excluir Peça"** no perfil **CDI**, o registro é removido com segurança tanto do banco local quanto do arquivo JSON persistente do Docker.
3. **Sincronização Bidirecional**: O sistema funciona de forma híbrida — permite acesso instantâneo e offline (PWA) em dispositivos móveis na fábrica e sincroniza automaticamente com o servidor central Docker assim que conectado.

---

## 5. Garantia dos QR Codes (Unicidade, Persistência e Validade)
- **100% Real e Escaneável**: Utiliza o motor padrão ISO/IEC 18004 (`qrcode`) com redundância de dados (Level M), legível por qualquer câmera de smartphone ou leitor laser/óptico.
- **Unicidade Garantida**: Validação estrita antes do salvamento impedindo Tags duplicadas, com botão de geração automática de Tag única.
- **Persistência Total**: O payload (ex: `IFTA:MOT-IND-042` ou `IFTA:MAQ-EST-01`) é salvo e preservado no banco de dados do Docker (`/app/data/ifta_database.json`) e local (`storageService`), resistindo a recarregamentos e alterações de outros campos.
- **Pronto para Impressão**: Layout de etiqueta industrial com botão direto de impressão e download em PNG de alta definição.
