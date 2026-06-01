class FieldIdentifier {
    constructor() {
        this.entityRules = this.getDefaultEntityRules();
        this.customRules = [];
    }

    getDefaultEntityRules() {
        return {
            name: {
                entity: 'name',
                namePatterns: ['name', 'fullname', 'full_name', 'realname', 'real_name', 'contactname', 'contact_name', 'username', 'user_name', 'consignee', 'receiver'],
                idPatterns: ['name', 'fullname', 'realname', 'username'],
                placeholderPatterns: ['姓名', '名字', '用户名', '收货人', '联系人', '真实姓名', '您的姓名', '请输入姓名', '真实名称'],
                labelPatterns: ['姓名', '名字', '用户名', '收货人', '联系人', '真实姓名'],
                typePatterns: [],
                priority: 1
            },
            phone: {
                entity: 'phone',
                namePatterns: ['phone', 'mobile', 'tel', 'telephone', 'cellphone', 'cell_phone', 'handphone', 'phonenumber', 'phone_number', 'contactphone', 'contact_phone', 'receiverphone', 'receiver_phone'],
                idPatterns: ['phone', 'mobile', 'tel', 'telephone', 'cellphone'],
                placeholderPatterns: ['手机', '电话', '手机号', '手机号码', '电话号码', '联系电话', '收货电话', '请输入手机号'],
                labelPatterns: ['手机', '电话', '手机号', '联系电话', '手机号码'],
                typePatterns: ['tel'],
                priority: 2
            },
            email: {
                entity: 'email',
                namePatterns: ['email', 'mail', 'e-mail', 'emailaddress', 'email_address', 'mailaddress', 'mail_address', 'useremail'],
                idPatterns: ['email', 'mail'],
                placeholderPatterns: ['邮箱', 'email', 'mail', '电子邮箱', '邮件地址', '请输入邮箱', '您的邮箱'],
                labelPatterns: ['邮箱', '电子邮箱', '邮件'],
                typePatterns: ['email'],
                priority: 2
            },
            idCard: {
                entity: 'idCard',
                namePatterns: ['idcard', 'id_card', 'identity', 'identitycard', 'identity_card', 'idnumber', 'id_number', 'idno', 'id_no', 'certno', 'cert_no', 'idnum'],
                idPatterns: ['idcard', 'identity', 'idnumber'],
                placeholderPatterns: ['身份证', '证件号', '身份号', '身份证号', '身份证号码', '证件号码', '请输入身份证'],
                labelPatterns: ['身份证', '证件号', '身份'],
                typePatterns: [],
                priority: 2
            },
            username: {
                entity: 'username',
                namePatterns: ['username', 'user_name', 'account', 'userid', 'user_id', 'loginname', 'login_name', 'nickname', 'nick_name', 'screenname', 'screen_name'],
                idPatterns: ['username', 'account', 'nickname'],
                placeholderPatterns: ['用户名', '账号', '账户', '账号名', '登录名', '昵称', '请输入用户名'],
                labelPatterns: ['用户名', '账号', '账户', '昵称', '登录名'],
                typePatterns: [],
                priority: 1
            },
            nickname: {
                entity: 'nickname',
                namePatterns: ['nickname', 'nick_name', 'displayname', 'display_name', 'screenname', 'screen_name'],
                idPatterns: ['nickname', 'displayname'],
                placeholderPatterns: ['昵称', '显示名', '别名', '请输入昵称'],
                labelPatterns: ['昵称', '显示名', '别名'],
                typePatterns: [],
                priority: 1
            },
            gender: {
                entity: 'gender',
                namePatterns: ['gender', 'sex'],
                idPatterns: ['gender', 'sex'],
                placeholderPatterns: ['性别', '请选择性别'],
                labelPatterns: ['性别'],
                typePatterns: [],
                priority: 1
            },
            age: {
                entity: 'age',
                namePatterns: ['age'],
                idPatterns: ['age'],
                placeholderPatterns: ['年龄', '请输入年龄'],
                labelPatterns: ['年龄'],
                typePatterns: [],
                priority: 1
            },
            birthday: {
                entity: 'birthday',
                namePatterns: ['birthday', 'birth', 'birthdate', 'birth_date', 'dob', 'dateofbirth', 'date_of_birth'],
                idPatterns: ['birthday', 'birthdate', 'dob'],
                placeholderPatterns: ['生日', '出生日期', '出生年月', '请选择生日', '请输入生日'],
                labelPatterns: ['生日', '出生日期', '出生'],
                typePatterns: ['date'],
                priority: 2
            },
            region: {
                entity: 'region',
                namePatterns: ['region', 'province', 'city', 'area', 'district', 'location', 'state', 'county', 'zone', 'prefecture'],
                idPatterns: ['region', 'province', 'city', 'district'],
                placeholderPatterns: ['地区', '省市', '省份', '城市', '所在地区', '省市区', '请选择地区', '请选择城市'],
                labelPatterns: ['地区', '省份', '城市', '所在地区', '省/市/区'],
                typePatterns: [],
                priority: 1
            },
            address: {
                entity: 'address',
                namePatterns: ['address', 'addr', 'detailaddress', 'detail_address', 'streetaddress', 'street_address', 'shippingaddress', 'shipping_address', 'deliveryaddress', 'delivery_address'],
                idPatterns: ['address', 'addr'],
                placeholderPatterns: ['地址', '详细地址', '收货地址', '街道地址', '所在地址', '请输入地址', '请输入详细地址'],
                labelPatterns: ['地址', '详细地址', '收货地址'],
                typePatterns: [],
                priority: 2
            },
            zipcode: {
                entity: 'zipcode',
                namePatterns: ['zipcode', 'zip', 'zip_code', 'postcode', 'post_code', 'postalcode', 'postal_code'],
                idPatterns: ['zipcode', 'postcode', 'zip'],
                placeholderPatterns: ['邮编', '邮政编码', 'postal', 'zip', '请输入邮编'],
                labelPatterns: ['邮编', '邮政编码'],
                typePatterns: [],
                priority: 1
            },
            country: {
                entity: 'country',
                namePatterns: ['country', 'nation'],
                idPatterns: ['country', 'nation'],
                placeholderPatterns: ['国家', '请选择国家', '所在国家'],
                labelPatterns: ['国家'],
                typePatterns: [],
                priority: 1
            },
            company: {
                entity: 'company',
                namePatterns: ['company', 'companyname', 'company_name', 'organization', 'organizationname', 'org_name', 'corporation', 'enterprise'],
                idPatterns: ['company', 'organization'],
                placeholderPatterns: ['公司', '企业', '单位', '公司名称', '单位名称', '所在公司', '请输入公司名称'],
                labelPatterns: ['公司', '企业', '单位', '公司名称'],
                typePatterns: [],
                priority: 1
            },
            job: {
                entity: 'job',
                namePatterns: ['job', 'jobtitle', 'job_title', 'position', 'title', 'occupation', 'profession'],
                idPatterns: ['job', 'position', 'occupation'],
                placeholderPatterns: ['职位', '岗位', '职业', '工作职位', '请输入职位', '您的职位'],
                labelPatterns: ['职位', '职业', '岗位'],
                typePatterns: [],
                priority: 1
            }
        };
    }

    getAllRules() {
        return this.entityRules;
    }

    identifyField(element) {
        if (!element) return null;

        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '');
        const type = (element.type || '').toLowerCase();
        const className = (element.className || '').toLowerCase();

        const label = this.getAssociatedLabel(element);
        const labelText = label ? label.toLowerCase() : '';

        let bestMatch = null;
        let bestScore = 0;

        for (const [entityKey, rule] of Object.entries(this.entityRules)) {
            const score = this.calculateMatchScore(rule, name, id, placeholder, type, labelText, className);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = entityKey;
            }
        }

        if (bestScore >= 1) {
            return {
                entity: this.entityRules[bestMatch].entity,
                confidence: Math.min(bestScore / 5, 1),
                element: element
            };
        }

        return null;
    }

    calculateMatchScore(rule, name, id, placeholder, type, labelText, className) {
        let score = 0;

        if (rule.typePatterns && rule.typePatterns.includes(type)) {
            score += 2;
        }

        for (const pattern of rule.namePatterns) {
            if (name.includes(pattern) || className.includes(pattern)) {
                score += 3;
                if (name === pattern || name.endsWith('[' + pattern + ']')) {
                    score += 1;
                }
                break;
            }
        }

        for (const pattern of rule.idPatterns) {
            if (id.includes(pattern)) {
                score += 2;
                if (id === pattern) {
                    score += 1;
                }
                break;
            }
        }

        for (const pattern of rule.placeholderPatterns) {
            if (this.fuzzyMatch(placeholder, pattern)) {
                score += 2;
                break;
            }
        }

        for (const pattern of rule.labelPatterns) {
            if (this.fuzzyMatch(labelText, pattern)) {
                score += 3;
                break;
            }
        }

        return score;
    }

    fuzzyMatch(text, pattern) {
        if (!text || !pattern) return false;
        const textLower = text.toLowerCase();
        const patternLower = pattern.toLowerCase();

        if (textLower.includes(patternLower)) {
            return true;
        }

        const patternChars = patternLower.replace(/\s+/g, '');
        const textChars = textLower.replace(/\s+/g, '');
        
        let i = 0;
        for (const char of textChars) {
            if (char === patternChars[i]) {
                i++;
                if (i >= patternChars.length) {
                    return true;
                }
            }
        }

        return false;
    }

    getAssociatedLabel(element) {
        if (!element) return null;

        if (element.labels && element.labels.length > 0) {
            return element.labels[0].textContent || element.labels[0].innerText;
        }

        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                return label.textContent || label.innerText;
            }
        }

        const parent = element.closest('label');
        if (parent) {
            const clone = parent.cloneNode(true);
            const inputs = clone.querySelectorAll('input, select, textarea');
            inputs.forEach(input => input.remove());
            return clone.textContent || clone.innerText;
        }

        const fieldset = element.closest('fieldset');
        if (fieldset) {
            const legend = fieldset.querySelector('legend');
            if (legend) {
                return legend.textContent || legend.innerText;
            }
        }

        let prev = element.previousElementSibling;
        while (prev) {
            if (prev.tagName === 'LABEL') {
                return prev.textContent || prev.innerText;
            }
            if (prev.tagName === 'SPAN' && prev.classList && prev.classList.contains('label')) {
                return prev.textContent || prev.innerText;
            }
            prev = prev.previousElementSibling;
        }

        return null;
    }

    scanPage(rootElement = document) {
        const fields = [];
        const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), select, textarea';
        const elements = rootElement.querySelectorAll(selector);

        elements.forEach(element => {
            const identification = this.identifyField(element);
            if (identification) {
                fields.push(identification);
            }
        });

        return fields;
    }

    getFormFields(formElement) {
        if (!formElement) return [];
        return this.scanPage(formElement);
    }
}
