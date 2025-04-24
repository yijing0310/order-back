CREATE DATABASE how_order;
USE how_order;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  account VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users (email, account, password_hash, name)
VALUES ('jing@example.com', 'jing3320', '$2b$10$zj4EyfqWJrr61Cs/Wbn1AOr0norL.XEA8uMc9aKLlFPKUE0Q8i/MW', '小禎');

CREATE TABLE orderGroups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_uuid VARCHAR(50) UNIQUE,
  owner_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  restaurant VARCHAR(100) NOT NULL,
  tel VARCHAR(100),
  menu_link VARCHAR(255),
  max_people INT,
  deadline DATETIME NOT NULL,
  password VARCHAR(100),
  description TEXT,
  status ENUM('open', 'full', 'closed') DEFAULT 'open',
  template VARCHAR(100), -- 模板 之後新增default
  is_active BOOLEAN DEFAULT TRUE, -- 刪除揪團
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  -- FOREIGN KEY (template) REFERENCES menu_templates(name) ON DELETE CASCADE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_uuid VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INT DEFAULT 1,
  price DECIMAL(10, 2),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Paid', 'Non-payment') DEFAULT 'Non-payment',
  FOREIGN KEY (group_uuid) REFERENCES orderGroups(group_uuid) ON DELETE CASCADE
);


CREATE TABLE menu_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,              
  fields JSON NOT NULL,                   
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
-- 飲料模板
INSERT INTO menu_templates (name, fields)
VALUES (
  'drink',
  '[
    { "label": "訂購人,name", "type": "text", "required": true },
    { "label": "今天要點什麼,item_name", "type": "text", "required": true },
     {
      "label": "尺寸",
      "type": "radio",
      "options": ["中杯", "大杯"],
      "required": true
    },
    {
      "label": "甜度",
      "type": "radio",
      "options": ["無糖", "微糖", "半糖", "少糖", "全糖", "固定"],
      "required": true
    },
    {
      "label": "冰塊",
      "type": "radio",
      "options": ["去冰", "微冰", "少冰", "正常冰", "固定", "熱飲"],
      "required": true
    },
    { "label": "備註", "type": "textarea" }
  ]'
);
-- 一般模板
INSERT INTO menu_templates (name, fields)
VALUES (
  'basic',
  '[
    { "label": "訂購人,name", "type": "text", "required": true },
    { "label": "今天要點什麼,item_name", "type": "text", "required": true },
    { "label": "備註", "type": "textarea" }
  ]'
);
# =============== 重設密碼儲存token=================
CREATE TABLE reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

