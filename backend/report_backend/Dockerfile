FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# حل کامل مشکل npm در ایران با mirror داخلی
#RUN npm config set registry https://mirror2.chabokan.net/npm/

ENV NPM_CONFIG_REGISTRY=https://npm.devneeds.ir/

# اگر خواستی این دو تا را هم فعال کن (پایداری بیشتر)
# RUN npm config set fetch-retries 5
# RUN npm config set fetch-retry-mintimeout 20000

RUN npm install --verbose

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
