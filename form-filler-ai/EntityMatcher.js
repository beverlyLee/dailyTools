class EntityMatcher {
    constructor(userProfile = {}) {
        this.userProfile = userProfile;
        this.entityAliases = this.getDefaultEntityAliases();
    }

    getDefaultEntityAliases() {
        return {
            name: ['name', 'fullName', 'full_name', 'realName', 'real_name', 'contactName', 'contact_name', 'consignee', 'receiver'],
            phone: ['phone', 'mobile', 'telephone', 'tel', 'cellPhone', 'cell_phone', 'contactPhone', 'contact_phone'],
            email: ['email', 'mail', 'e-mail', 'emailAddress', 'email_address', 'mailAddress'],
            idCard: ['idCard', 'id_card', 'identityCard', 'identity_card', 'idNumber', 'id_number', 'certNo', 'cert_no'],
            username: ['username', 'user_name', 'account', 'userAccount', 'user_account', 'loginName', 'login_name'],
            nickname: ['nickname', 'nick_name', 'displayName', 'display_name', 'screenName', 'screen_name'],
            gender: ['gender', 'sex'],
            age: ['age'],
            birthday: ['birthday', 'birthDate', 'birth_date', 'dateOfBirth', 'date_of_birth', 'dob'],
            region: ['region', 'province', 'city', 'district', 'area', 'location', 'state'],
            address: ['address', 'addr', 'detailAddress', 'detail_address', 'streetAddress', 'street_address'],
            zipcode: ['zipcode', 'zip', 'zip_code', 'postCode', 'post_code', 'postalCode', 'postal_code'],
            country: ['country', 'nation'],
            company: ['company', 'companyName', 'company_name', 'organization', 'orgName', 'org_name', 'enterprise'],
            job: ['job', 'jobTitle', 'job_title', 'position', 'occupation', 'profession', 'title']
        };
    }

    setProfile(userProfile) {
        this.userProfile = userProfile || {};
    }

    getProfile() {
        return this.userProfile;
    }

    matchEntity(identifiedEntity) {
        if (!identifiedEntity || !identifiedEntity.entity) {
            return null;
        }

        const entityKey = identifiedEntity.entity;
        const aliases = this.entityAliases[entityKey] || [entityKey];

        let matchedValue = null;
        let matchedKey = null;

        for (const alias of aliases) {
            const value = this.getValueFromProfile(alias);
            if (value !== null && value !== undefined && value !== '') {
                matchedValue = value;
                matchedKey = alias;
                break;
            }
        }

        if (matchedValue !== null) {
            return {
                entity: entityKey,
                matchedKey: matchedKey,
                value: matchedValue,
                confidence: identifiedEntity.confidence,
                element: identifiedEntity.element
            };
        }

        return null;
    }

    getValueFromProfile(key) {
        if (!this.userProfile) return null;

        if (this.userProfile[key] !== undefined) {
            return this.userProfile[key];
        }

        const lowerKey = key.toLowerCase();
        for (const [k, v] of Object.entries(this.userProfile)) {
            if (k.toLowerCase() === lowerKey) {
                return v;
            }
        }

        return null;
    }

    batchMatch(identifiedFields) {
        const matches = [];
        const noMatches = [];

        if (!Array.isArray(identifiedFields)) {
            return { matches: [], noMatches: [] };
        }

        for (const field of identifiedFields) {
            const match = this.matchEntity(field);
            if (match) {
                matches.push(match);
            } else {
                noMatches.push(field);
            }
        }

        return { matches, noMatches };
    }

    getAvailableEntities() {
        const entities = [];
        for (const [key, aliases] of Object.entries(this.entityAliases)) {
            const value = this.getValueFromProfile(key);
            if (value !== null && value !== undefined && value !== '') {
                entities.push({
                    entity: key,
                    aliases: aliases,
                    value: value
                });
            }
        }
        return entities;
    }

    getEntityDisplayInfo(entityKey) {
        const displayNames = {
            name: '姓名',
            phone: '手机号',
            email: '邮箱',
            idCard: '身份证号',
            username: '用户名',
            nickname: '昵称',
            gender: '性别',
            age: '年龄',
            birthday: '生日',
            region: '地区',
            address: '地址',
            zipcode: '邮编',
            country: '国家',
            company: '公司',
            job: '职位'
        };

        const value = this.getValueFromProfile(entityKey);
        return {
            entity: entityKey,
            displayName: displayNames[entityKey] || entityKey,
            value: value,
            hasValue: value !== null && value !== undefined && value !== ''
        };
    }

    generateMatchReport(identifiedFields) {
        const { matches, noMatches } = this.batchMatch(identifiedFields);
        
        const report = {
            totalFields: identifiedFields.length,
            matchedCount: matches.length,
            unmatchedCount: noMatches.length,
            successRate: identifiedFields.length > 0 ? (matches.length / identifiedFields.length * 100).toFixed(1) : 0,
            matches: matches.map(m => ({
                entity: m.entity,
                displayName: this.getEntityDisplayInfo(m.entity).displayName,
                value: m.value,
                confidence: m.confidence
            })),
            noMatches: noMatches.map(f => ({
                entity: f.entity,
                displayName: this.getEntityDisplayInfo(f.entity).displayName,
                reason: '用户资料中无对应值'
            }))
        };

        return report;
    }
}
