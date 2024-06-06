FROM node:21

COPY package*.json ./
WORKDIR /opt/server/backend-test
COPY . . 
RUN npm install
EXPOSE 3000
CMD [ "node", "index.js" ]